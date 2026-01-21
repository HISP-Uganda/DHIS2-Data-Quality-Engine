import fetch from 'node-fetch'
import { addDQRunStats } from './statsStore'
import { notificationManager } from './notifications/notificationManager'

// Helper function to add timeout to fetch requests
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 120000) {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
        console.log(`[Engine] ⏱️ Fetch timeout reached for ${url}`)
        controller.abort()
    }, timeoutMs)

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        })
        clearTimeout(timeout)
        return response
    } catch (error: any) {
        clearTimeout(timeout)
        if (error.name === 'AbortError') {
            throw new Error(`Request to ${url} timed out after ${timeoutMs / 1000} seconds`)
        }
        throw error
    }
}

export interface RunDQParams {
    sourceUrl: string
    sourceUser: string
    sourcePass: string
    dataElements: string[]
    datasetDC: string
    orgUnit: string | string[]
    period: string | string[]

    destinationUrl?: string
    destinationUser?: string
    destinationPass?: string
    destinationDataset?: string
    destinationOrgUnit?: string | string[]

    dataElementMapping?: Record<string, string>
}

interface UserInfo {
    displayName?: string
}



export type ProgressCallback = (message: string, step: number, totalSteps: number) => void

interface DataValue {
    dataElement: string
    period: string
    orgUnit: string
    value: string
    lastUpdated?: string
}

interface DataValueResponse {
    dataValues: DataValue[]
}

interface DataValueSetsResponse {
    dataSet: string
    completeDate: string
    period: string
    orgUnit: string
    dataValues: DataValue[]
}

export async function runDQ(params: RunDQParams, onProgress?: ProgressCallback) {
    const {
        sourceUrl,
        sourceUser,
        sourcePass,
        dataElements,
        datasetDC,
        orgUnit,
        period,
        destinationUrl,
        destinationUser,
        destinationPass,
        destinationDataset: _destinationDataset,
        destinationOrgUnit,
        dataElementMapping,
    } = params

    // Ensure period is always a single string for processing
    // If array is passed, use the first element
    const singlePeriod = Array.isArray(period) ? period[0] : period

    const baseSrc = sourceUrl.replace(/\/$/, '')
    const authSrc = Buffer.from(`${sourceUser}:${sourcePass}`).toString('base64')

    const startTime = Date.now()
    const totalSteps = destinationUrl ? 8 : 6
    let currentStep = 0

    try {


        currentStep++
        onProgress?.(`Authenticating with DHIS2 server...`, currentStep, totalSteps)
        console.log(`[Engine] Step ${currentStep}/${totalSteps}: Checking login at ${baseSrc}/api/me.json`)

        const meResp = await fetch(`${baseSrc}/api/me.json`, {
            headers: { Authorization: `Basic ${authSrc}` },
        })

        if (!meResp.ok) {
            const body = await meResp.text().catch(() => '')
            console.error('[Engine] Authentication failed:', body)
            throw new Error(`Login failed: ${meResp.status} ${meResp.statusText}`)
        }

        const userInfo = (await meResp.json()) as UserInfo
        console.log(`[Engine] ✅ Authenticated as: ${userInfo.displayName || sourceUser}`)


        currentStep++
        onProgress?.(`Fetching metadata for name resolution...`, currentStep, totalSteps)
        console.log(`[Engine] Step ${currentStep}/${totalSteps}: Fetching metadata`)


        const orgUnits = Array.isArray(orgUnit) ? orgUnit : [orgUnit]


        const metadataResp = await fetch(`${baseSrc}/api/metadata.json?dataElements:filter=id:in:[${dataElements.join(';')}]&organisationUnits:filter=id:in:[${orgUnits.join(';')}]&dataSets:filter=id:in:[${datasetDC}]`, {
            headers: { Authorization: `Basic ${authSrc}` },
        })

        let metadata: any = { dataElements: [], organisationUnits: [], dataSets: [] }
        if (metadataResp.ok) {
            metadata = await metadataResp.json()
            console.log(`[Engine] ✅ Metadata loaded: ${metadata.dataElements?.length || 0} data elements, ${metadata.organisationUnits?.length || 0} org units, ${metadata.dataSets?.length || 0} datasets`)
        } else {
            console.log(`[Engine] ⚠️ Could not fetch metadata for name resolution, will use UIDs`)
        }

        const dataElementNames = new Map()
        const orgUnitNames = new Map()
        const datasetNames = new Map()

        metadata.dataElements?.forEach((de: any) => dataElementNames.set(de.id, de.displayName))
        metadata.organisationUnits?.forEach((ou: any) => orgUnitNames.set(ou.id, ou.displayName))
        metadata.dataSets?.forEach((ds: any) => datasetNames.set(ds.id, ds.displayName))


        console.log(`[Engine] → Dataset: ${datasetNames.get(datasetDC) || datasetDC}`)
        console.log(`[Engine] → Data Elements: ${dataElements.map(id => dataElementNames.get(id) || id).join(', ')}`)
        console.log(`[Engine] → Org Units: ${orgUnits.map(id => orgUnitNames.get(id) || id).join(', ')}`)


        currentStep++
        onProgress?.(`Fetching raw data values for period ${singlePeriod}...`, currentStep, totalSteps)
        console.log(`[Engine] Step ${currentStep}/${totalSteps}: Fetching raw data values`)


        console.log(`[Engine] → Original period format: "${singlePeriod}"`)
        let formattedPeriod = singlePeriod


        if (!/^\d{6}$/.test(singlePeriod) && singlePeriod.includes(' ')) {
            console.log(`[Engine] ⚠️ Period "${singlePeriod}" doesn't appear to be in YYYYMM format`)
            console.log(`[Engine] ⚠️ DHIS2 typically expects periods like "202506" not "June 2025"`)

        }

        const orgUnitDisplayNames = orgUnits.map(id => orgUnitNames.get(id) || id)
        console.log(`[Engine] → Requesting data for ${orgUnits.length} org units: ${orgUnitDisplayNames.join(', ')}`)
        console.log(`[Engine] → Dataset: ${datasetNames.get(datasetDC) || datasetDC}, Period: ${formattedPeriod}`)

        let allDataValues: any[] = []
        let lastDataResp: any = null
        let lastError: string = ''


        for (const singleOrgUnit of orgUnits) {
            const dataValueUrl = new URL(`${baseSrc}/api/dataValueSets.json`)
            dataValueUrl.searchParams.append('dataSet', datasetDC)
            dataValueUrl.searchParams.append('orgUnit', singleOrgUnit)
            dataValueUrl.searchParams.append('period', formattedPeriod)
            dataValueUrl.searchParams.append('paging', 'false')

            console.log(`[Engine] → GET ${dataValueUrl.toString()} (org unit: ${singleOrgUnit})`)

            const singleDataResp = await fetchWithTimeout(dataValueUrl.toString(), {
                headers: { Authorization: `Basic ${authSrc}` },
            }, 120000) // 2 minute timeout

            if (singleDataResp.ok) {
                const singleDataValueSetsResponse = (await singleDataResp.json()) as DataValueSetsResponse
                const singleDataValues = singleDataValueSetsResponse.dataValues || []
                allDataValues.push(...singleDataValues)
                const orgUnitName = orgUnitNames.get(singleOrgUnit) || singleOrgUnit
                console.log(`[Engine] ✅ Found ${singleDataValues.length} data values for ${orgUnitName} (${singleOrgUnit})`)
            } else {
                const body = await singleDataResp.text().catch(() => '')
                const orgUnitName = orgUnitNames.get(singleOrgUnit) || singleOrgUnit
                console.log(`[Engine] ⚠️ No data found for org unit ${orgUnitName} (${singleOrgUnit}): ${singleDataResp.status} - ${body}`)
                lastError = body
                lastDataResp = singleDataResp
            }
        }

        let rawData: DataValueResponse

        if (allDataValues.length === 0) {
            console.error('[Engine] DataValueSets API failed - no data found in any org unit')
            console.error('[Engine] Last error:', lastError)


            console.log(`[Engine] \u{1F50D} Debugging Information:`)
            console.log(`[Engine] \u2022 Dataset: ${datasetNames.get(datasetDC) || datasetDC}`)
            console.log(`[Engine] \u2022 Period: ${formattedPeriod}`)
            console.log(`[Engine] \u2022 Org Units searched: ${orgUnits.map(id => orgUnitNames.get(id) || id).join(', ')}`)
            console.log(`[Engine] \u2022 Data Elements expected: ${dataElements.map(id => dataElementNames.get(id) || id).join(', ')}`)


            currentStep++
            onProgress?.(`DataValueSets API failed, trying Analytics API as fallback...`, currentStep, totalSteps)
            console.log(`[Engine] Step ${currentStep}/${totalSteps}: Falling back to Analytics API`)

            const analyticsUrl = new URL(`${baseSrc}/api/analytics.json`)
            const dxDimension = `dx:${dataElements.join(';')}`
            analyticsUrl.searchParams.append('dimension', dxDimension)
            analyticsUrl.searchParams.append('dimension', `ou:${orgUnits.join(';')}`)
            analyticsUrl.searchParams.append('dimension', `pe:${formattedPeriod}`)
            analyticsUrl.searchParams.append('skipMeta', 'false')

            console.log(`[Engine] → Analytics Fallback URL: ${analyticsUrl.toString()}`)
            console.log(`[Engine] → Analytics Fallback for org units: ${orgUnits.join(', ')}`)

            const analyticsResp = await fetch(analyticsUrl.toString(), {
                headers: { Authorization: `Basic ${authSrc}` },
            })

            if (!analyticsResp.ok) {
                const analyticsBody = await analyticsResp.text().catch(() => '')
                console.error('[Engine] Analytics API also failed with status:', analyticsResp.status)
                console.error('[Engine] Analytics API error body:', analyticsBody)
                throw new Error(`Both DataValueSets and Analytics APIs failed. DataValueSets error: ${lastDataResp?.status || 'unknown'}, Analytics error: ${analyticsResp.status}. Analytics body: ${analyticsBody}`)
            }

            const analyticsData: any = await analyticsResp.json()
            console.log(`[Engine] ✅ Analytics fallback: Found ${analyticsData.rows?.length || 0} data points`)

            if (!analyticsData.rows || analyticsData.rows.length === 0) {

                const orgUnitDisplayNames = orgUnits.map(ou =>
                    orgUnitNames.get(ou) ||
                    analyticsData.metaData?.items?.[ou]?.name ||
                    ou
                ).join(', ')
                const periodName = analyticsData.metaData?.items?.[formattedPeriod]?.name || formattedPeriod
                const datasetName = datasetNames.get(datasetDC) || datasetDC


                const simpleError = `Source system does not have data for ${orgUnitDisplayNames} in ${periodName} for the selected data elements.`

                throw new Error(simpleError)
            }


            const convertedDataValues: DataValue[] = analyticsData.rows.map((row: any) => ({
                dataElement: row[0],
                orgUnit: row[1],
                period: row[2],
                value: String(row[3])
            }))

            rawData = { dataValues: convertedDataValues }
            console.log(`[Engine] ✅ Converted ${rawData.dataValues.length} analytics points to data values`)
        } else {
            rawData = { dataValues: allDataValues }
            console.log(`[Engine] ✅ Total data values from all org units: ${rawData.dataValues.length}`)

            if (rawData.dataValues.length > 0) {
                console.log(`[Engine] ✅ Sample data values:`, rawData.dataValues.slice(0, 3).map(dv => ({
                    dataElement: dv.dataElement,
                    orgUnit: dv.orgUnit,
                    value: dv.value
                })))
            }

            const dataByOrgUnit = new Map()
            rawData.dataValues.forEach(dv => {
                const count = dataByOrgUnit.get(dv.orgUnit) || 0
                dataByOrgUnit.set(dv.orgUnit, count + 1)
            })
            console.log(`[Engine] ✅ Data breakdown by org unit:`, Object.fromEntries(dataByOrgUnit))
        }

        currentStep++
        onProgress?.(`Processing data quality checks...`, currentStep, totalSteps)
        console.log(`[Engine] Step ${currentStep}/${totalSteps}: Processing data quality`)

        const dataByElement = new Map()
        rawData.dataValues.forEach(dv => {
            const elementName = dataElementNames.get(dv.dataElement) || dv.dataElement
            const count = dataByElement.get(elementName) || 0
            dataByElement.set(elementName, count + 1)
        })
        console.log(`[Engine] ✅ Data breakdown by element:`, Object.fromEntries(dataByElement))

        const dqResults: Array<{ dataElement: string, value: string, issues: string[] }> = []

        for (const dataValue of rawData.dataValues || []) {
            const issues: string[] = []

            if (!dataValue.value || dataValue.value.trim() === '') {
                issues.push('Empty value')
            }

            if (isNaN(Number(dataValue.value)) && dataValue.value !== '') {
                issues.push('Non-numeric value')
            }

            if (Number(dataValue.value) < 0) {
                issues.push('Negative value')
            }

            dqResults.push({
                dataElement: dataValue.dataElement,
                value: dataValue.value,
                issues
            })

            const elementName = dataElementNames.get(dataValue.dataElement) || dataValue.dataElement
            console.log(`[Engine] Processed ${elementName}: ${dataValue.value} (${issues.length} issues)`)
        }

        currentStep++
        onProgress?.(`Generating data quality report...`, currentStep, totalSteps)
        console.log(`[Engine] Step ${currentStep}/${totalSteps}: Generating DQ report`)

        const totalIssues = dqResults.reduce((sum, result) => sum + result.issues.length, 0)
        console.log(`[Engine] ✅ DQ Report: ${dqResults.length} records processed, ${totalIssues} issues found`)

        let destinationResult = null

        if (destinationUrl && destinationUser && destinationPass) {
            currentStep++
            onProgress?.(`Authenticating with destination DHIS2...`, currentStep, totalSteps)
            console.log(`[Engine] Step ${currentStep}/${totalSteps}: Destination authentication`)

            const baseDst = destinationUrl.replace(/\/$/, '')
            const authDst = Buffer.from(`${destinationUser}:${destinationPass}`).toString('base64')

            const dstMeResp = await fetch(`${baseDst}/api/me.json`, {
                headers: { Authorization: `Basic ${authDst}` },
            })

            if (!dstMeResp.ok) {
                throw new Error(`Destination login failed: ${dstMeResp.status} ${dstMeResp.statusText}`)
            }

            const dstUserInfo = (await dstMeResp.json()) as UserInfo
            console.log(`[Engine] ✅ Destination authenticated as: ${dstUserInfo.displayName || destinationUser}`)

            currentStep++
            onProgress?.(`Posting data to destination DHIS2...`, currentStep, totalSteps)
            console.log(`[Engine] Step ${currentStep}/${totalSteps}: Posting data to destination`)

            const destinationOrgUnits = Array.isArray(destinationOrgUnit)
                ? destinationOrgUnit
                : destinationOrgUnit ? [destinationOrgUnit] : orgUnits

            const destinationDataValues: any[] = []

            console.log(`[Engine] Processing ${rawData.dataValues.length} data values for destination`)
            console.log(`[Engine] Data element mapping:`, dataElementMapping)
            
            let totalProcessed = 0
            let skippedCount = 0
            
            destinationOrgUnits.forEach(destOu => {
                rawData.dataValues.forEach(dv => {
                    totalProcessed++
                    // Only process data elements that have explicit mappings
                    if (dataElementMapping && dataElementMapping[dv.dataElement]) {
                        const mappedDataElement = dataElementMapping[dv.dataElement]
                        destinationDataValues.push({
                            dataElement: mappedDataElement,
                            period: singlePeriod,
                            orgUnit: destOu,
                            value: dv.value
                        })
                    } else {
                        skippedCount++
                        // Skip data elements without mappings
                        if (skippedCount <= 5) {
                            console.log(`[Engine] Skipping unmapped data element: ${dv.dataElement}`)
                        }
                    }
                })
            })
            
            console.log(`[Engine] Processed ${totalProcessed} values, included ${destinationDataValues.length}, skipped ${skippedCount} unmapped`)

            const postPayload = {
                dataValues: destinationDataValues
            }

            console.log(`[Engine] → Posting ${destinationDataValues.length} data values to destination:`, postPayload)

            const postResp = await fetch(`${baseDst}/api/dataValueSets.json`, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${authDst}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postPayload),
            })

            if (!postResp.ok) {
                const errorBody = await postResp.text().catch(() => '')
                console.error('[Engine] Destination post failed:', errorBody)
                throw new Error(`Failed to post to destination: ${postResp.status} ${errorBody}`)
            }

            const postResult: any = await postResp.json()
            console.log(`[Engine] ✅ Posted to destination:`, postResult)

            destinationResult = {
                posted: postResult.importCount?.imported || destinationDataValues.length,
                conflicts: postResult.conflicts || [],
                summary: postResult.importSummary || postResult
            }
        }

        currentStep++
        onProgress?.(`Processing completed!`, currentStep, totalSteps)
        console.log(`[Engine] Step ${currentStep}/${totalSteps}: All processing completed successfully`)

        const endTime = Date.now()
        const duration = endTime - startTime
        const completeness = dqResults.length > 0 ? ((dqResults.length - totalIssues) / dqResults.length) * 100 : 100

        addDQRunStats({
            orgUnit: Array.isArray(orgUnit) ? orgUnit.join(',') : orgUnit,
            period: singlePeriod,
            sourceDataElements: dataElements.length,
            destinationDataElements: destinationResult?.posted || 0,
            validationErrors: totalIssues,
            dataConflicts: destinationResult?.conflicts?.length || 0,
            completeness: Math.max(0, Math.min(100, completeness)),
            success: true,
            duration
        })

        const result = {
            success: true,
            summary: {
                recordsProcessed: dqResults.length,
                issuesFound: totalIssues,
                period: singlePeriod,
                orgUnit: Array.isArray(orgUnit) ? orgUnit.join(',') : orgUnit,
                dataElements: dataElements.length,
                destinationPosted: destinationResult?.posted || 0
            },
            results: dqResults,
            destinationResult
        }

        try {
            console.log('[Engine] Sending DQ completion notifications...')
            const notificationResult = await notificationManager.sendDQRunNotifications(orgUnit, result)
            console.log('[Engine] ✅ Notifications sent:', {
                facilitiesNotified: notificationResult.facilitiesNotified.length,
                emailsSent: notificationResult.emailsSent,
                whatsappSent: notificationResult.whatsappSent
            })
        } catch (notificationError) {
            console.error('[Engine] ⚠️ Failed to send notifications:', notificationError)
        }

        return result
    } catch (error: any) {
        const endTime = Date.now()
        const duration = endTime - startTime

        addDQRunStats({
            orgUnit: Array.isArray(orgUnit) ? orgUnit.join(',') : orgUnit,
            period: singlePeriod,
            sourceDataElements: dataElements.length,
            destinationDataElements: 0,
            validationErrors: 0,
            dataConflicts: 0,
            completeness: 0,
            success: false,
            duration
        })

        try {
            console.log('[Engine] Sending DQ failure notifications...')
            const failureResult = {
                success: false,
                summary: {
                    recordsProcessed: 0,
                    issuesFound: 0,
                    period: singlePeriod,
                    orgUnit: Array.isArray(orgUnit) ? orgUnit.join(',') : orgUnit,
                    dataElements: dataElements.length,
                    destinationPosted: 0
                },
                error: error.message
            }
            const notificationResult = await notificationManager.sendDQRunNotifications(orgUnit, failureResult)
            console.log('[Engine] ✅ Failure notifications sent:', {
                facilitiesNotified: notificationResult.facilitiesNotified.length,
                emailsSent: notificationResult.emailsSent,
                whatsappSent: notificationResult.whatsappSent
            })
        } catch (notificationError) {
            console.error('[Engine] ⚠️ Failed to send failure notifications:', notificationError)
        }

        console.error('[Engine] DQ run failed:', error.message)
        throw error
    }
}