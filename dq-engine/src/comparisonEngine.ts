/**
 * Comparison Engine
 *
 * Core dataset comparison logic that can be used both:
 * - Synchronously (for quick comparisons)
 * - Asynchronously via Bull queue (for long-running comparisons)
 */

export interface DataElementGroup {
    id: string
    logicalName: string
    elements: { [datasetId: string]: any }
}

export interface ComparisonResult {
    dataElementGroup: string
    logicalDataElement: string
    orgUnit: string
    orgUnitName: string
    period: string
    values: { [key: string]: string | null }
    status: 'valid' | 'mismatch' | 'missing' | 'out_of_range' | 'consensus'
    variance?: number
    consensusValue?: string
}

/**
 * Perform dataset comparison for a single period
 * This is the core comparison logic extracted from DataComparisonModal.tsx
 */
async function performSinglePeriodComparison(
    destinationUrl: string,
    destinationUser: string,
    destinationPass: string,
    orgUnit: string,
    orgUnitName: string,
    period: string,
    selectedDatasetIds: string[],
    dataElementGroups: DataElementGroup[],
    onProgress: (step: string, progress: number) => Promise<void> | void
): Promise<{
    datasets: any[]
    comparisonResults: ComparisonResult[]
    summary: {
        totalRecords: number
        validRecords: number
        mismatchedRecords: number
        missingRecords: number
        outOfRangeRecords: number
    }
}> {
    const baseUrl = destinationUrl.replace(/\/$/, '')
    const auth = Buffer.from(`${destinationUser}:${destinationPass}`).toString('base64')

    await onProgress('Preparing dataset information...', 10)

    // Fetch org unit display name if not provided or if it's a UID
    let resolvedOrgUnitName = orgUnitName
    if (!orgUnitName || orgUnitName === orgUnit || orgUnitName.length === 11) {
        try {
            const ouResponse = await fetch(
                `${baseUrl}/api/organisationUnits/${orgUnit}.json?fields=displayName`,
                { headers: { Authorization: `Basic ${auth}` } }
            )
            if (ouResponse.ok) {
                const ouData = await ouResponse.json()
                resolvedOrgUnitName = ouData.displayName || orgUnitName
                console.log(`[Comparison] Resolved org unit name: ${resolvedOrgUnitName}`)
            }
        } catch (error) {
            console.log('[Comparison] Could not fetch org unit display name, using provided name')
        }
    }

    // Create dataset details based on data element groups
    const datasetDetails = []

    for (const datasetId of selectedDatasetIds) {
        try {
            const datasetResponse = await fetch(
                `${baseUrl}/api/dataSets/${datasetId}.json?fields=id,displayName,dataSetElements[dataElement[id,displayName]]`,
                { headers: { Authorization: `Basic ${auth}` } }
            )

            if (!datasetResponse.ok) {
                throw new Error(`Failed to fetch dataset ${datasetId}: ${datasetResponse.status}`)
            }

            const datasetData = await datasetResponse.json()
            datasetDetails.push(datasetData)
        } catch (error: any) {
            console.error(`Error fetching dataset ${datasetId}:`, error)
            throw error
        }
    }

    await onProgress('Fetching data values from all datasets...', 30)

    // Fetch data values for each dataset
    const allDataValues: { [datasetId: string]: any[] } = {}

    for (let i = 0; i < selectedDatasetIds.length; i++) {
        const datasetId = selectedDatasetIds[i]
        const progress = 30 + ((i / selectedDatasetIds.length) * 40)

        await onProgress(`Fetching data from dataset ${i + 1}/${selectedDatasetIds.length}...`, progress)

        try {
            const response = await fetch(
                `${baseUrl}/api/dataValueSets.json?dataSet=${datasetId}&orgUnit=${orgUnit}&period=${period}`,
                { headers: { Authorization: `Basic ${auth}` } }
            )

            if (!response.ok) {
                throw new Error(`Failed to fetch data values for dataset ${datasetId}: ${response.status}`)
            }

            const data = await response.json()
            allDataValues[datasetId] = data.dataValues || []

            console.log(`[Comparison] Dataset ${datasetId}: ${allDataValues[datasetId].length} values`)
        } catch (error: any) {
            console.error(`Error fetching data values for dataset ${datasetId}:`, error)
            allDataValues[datasetId] = []
        }
    }

    await onProgress('Analyzing data element value differences...', 70)

    // Analyze differences
    const comparisonResults: ComparisonResult[] = []

    for (let groupIndex = 0; groupIndex < dataElementGroups.length; groupIndex++) {
        const group = dataElementGroups[groupIndex]
        const progress = 70 + ((groupIndex / dataElementGroups.length) * 20)

        await onProgress(`Analyzing group ${groupIndex + 1}/${dataElementGroups.length}...`, progress)

        const values: { [key: string]: string | null } = {}
        let hasData = false

        // Collect values from each dataset for this logical data element
        for (const datasetId of selectedDatasetIds) {
            const element = group.elements[datasetId]

            if (element) {
                const datasetValues = allDataValues[datasetId] || []
                const valueEntry = datasetValues.find((dv: any) => dv.dataElement === element.id)

                if (valueEntry && valueEntry.value) {
                    values[`dataset${selectedDatasetIds.indexOf(datasetId) + 1}Value`] = valueEntry.value
                    hasData = true
                } else {
                    values[`dataset${selectedDatasetIds.indexOf(datasetId) + 1}Value`] = null
                }
            } else {
                values[`dataset${selectedDatasetIds.indexOf(datasetId) + 1}Value`] = null
            }
        }

        // Only add to results if at least one dataset has data
        if (!hasData) continue

        // Determine status and calculate variance
        const nonNullValues = Object.values(values).filter(v => v !== null)
        let status: 'valid' | 'mismatch' | 'missing' | 'consensus' = 'valid'
        let variance: number | undefined

        if (nonNullValues.length === 0) {
            status = 'missing'
        } else if (nonNullValues.length === 1) {
            status = 'missing'
        } else {
            // Check if all values are the same
            const uniqueValues = new Set(nonNullValues)
            if (uniqueValues.size > 1) {
                status = 'mismatch'

                // Calculate variance for numeric values
                const numericValues = nonNullValues
                    .map(v => parseFloat(v as string))
                    .filter(n => !isNaN(n))

                if (numericValues.length > 0) {
                    const max = Math.max(...numericValues)
                    const min = Math.min(...numericValues)
                    variance = max - min
                }
            }
        }

        comparisonResults.push({
            dataElementGroup: group.id,
            logicalDataElement: group.logicalName,
            orgUnit,
            orgUnitName: resolvedOrgUnitName,
            period,
            values,
            status,
            variance,
        })
    }

    await onProgress('Calculating summary statistics...', 95)

    // Calculate summary
    const validRecords = comparisonResults.filter(r => r.status === 'valid').length
    const summary = {
        totalRecords: comparisonResults.length,
        validRecords: validRecords,
        matchingRecords: validRecords, // Alias for notifications template compatibility
        mismatchedRecords: comparisonResults.filter(r => r.status === 'mismatch').length,
        missingRecords: comparisonResults.filter(r => r.status === 'missing').length,
        outOfRangeRecords: 0,
    }

    // Log summary with quality issues highlighted
    const totalIssues = summary.mismatchedRecords + summary.missingRecords
    console.log(`[Comparison] ========================================`)
    console.log(`[Comparison] COMPARISON SUMMARY:`)
    console.log(`[Comparison]   Total Records: ${summary.totalRecords}`)
    console.log(`[Comparison]   ✅ Valid (matching): ${summary.validRecords}`)
    console.log(`[Comparison]   ⚠️  Mismatched: ${summary.mismatchedRecords}`)
    console.log(`[Comparison]   ❌ Missing data: ${summary.missingRecords}`)
    console.log(`[Comparison]   🔍 Total Quality Issues: ${totalIssues}`)
    console.log(`[Comparison] ========================================`)

    // Log details of mismatched records for debugging
    if (summary.mismatchedRecords > 0) {
        console.log(`[Comparison] Mismatched records details:`)
        comparisonResults
            .filter(r => r.status === 'mismatch')
            .slice(0, 5) // Show first 5 for debugging
            .forEach(r => {
                const vals = Object.values(r.values).filter(v => v !== null).join(', ')
                console.log(`  - ${r.logicalDataElement}: [${vals}] (variance: ${r.variance})`)
            })
    }

    await onProgress('Comparison complete!', 100)

    // NOTE: Automatic notifications disabled - user must manually click "Send Alert" button
    // Notifications are now sent via the manual API endpoint: POST /api/send-comparison-notifications
    console.log('[Comparison] ℹ️  Automatic notifications disabled - user will manually trigger via UI')

    return {
        datasets: datasetDetails,
        comparisonResults,
        summary,
    }
}

/**
 * Perform dataset comparison synchronously (supports multiple periods)
 * Wrapper function that handles both single and multiple period comparisons
 */
export async function performDatasetComparisonSync(
    destinationUrl: string,
    destinationUser: string,
    destinationPass: string,
    orgUnit: string,
    orgUnitName: string,
    period: string | string[],
    selectedDatasetIds: string[],
    dataElementGroups: DataElementGroup[],
    onProgress: (step: string, progress: number) => Promise<void> | void
): Promise<{
    datasets: any[]
    comparisonResults: ComparisonResult[]
    summary: {
        totalRecords: number
        validRecords: number
        mismatchedRecords: number
        missingRecords: number
        outOfRangeRecords: number
    }
    periods?: string[] // Array of periods if multi-period
}> {
    // Normalize period to array
    const periods = Array.isArray(period) ? period : [period]

    if (periods.length === 1) {
        // Single period - use existing logic directly
        return await performSinglePeriodComparison(
            destinationUrl,
            destinationUser,
            destinationPass,
            orgUnit,
            orgUnitName,
            periods[0],
            selectedDatasetIds,
            dataElementGroups,
            onProgress
        )
    }

    // Multi-period comparison
    console.log(`[Comparison] Multi-period comparison: ${periods.length} periods`)

    let allDatasets: any[] = []
    let allComparisonResults: ComparisonResult[] = []
    let aggregatedSummary = {
        totalRecords: 0,
        validRecords: 0,
        mismatchedRecords: 0,
        missingRecords: 0,
        outOfRangeRecords: 0
    }

    // Process each period
    for (let i = 0; i < periods.length; i++) {
        const currentPeriod = periods[i]
        const periodProgress = (i / periods.length) * 100

        await onProgress(`Processing period ${i + 1}/${periods.length}: ${currentPeriod}`, periodProgress)

        // Create period-specific progress callback
        const periodOnProgress = async (step: string, progress: number) => {
            const overallProgress = periodProgress + (progress / periods.length)
            await onProgress(`Period ${i + 1}/${periods.length}: ${step}`, overallProgress)
        }

        try {
            const periodResult = await performSinglePeriodComparison(
                destinationUrl,
                destinationUser,
                destinationPass,
                orgUnit,
                orgUnitName,
                currentPeriod,
                selectedDatasetIds,
                dataElementGroups,
                periodOnProgress
            )

            // Store datasets from first period only (they're the same)
            if (i === 0) {
                allDatasets = periodResult.datasets
            }

            // Aggregate results
            allComparisonResults.push(...periodResult.comparisonResults)
            aggregatedSummary.totalRecords += periodResult.summary.totalRecords
            aggregatedSummary.validRecords += periodResult.summary.validRecords
            aggregatedSummary.mismatchedRecords += periodResult.summary.mismatchedRecords
            aggregatedSummary.missingRecords += periodResult.summary.missingRecords
            aggregatedSummary.outOfRangeRecords += periodResult.summary.outOfRangeRecords

        } catch (error: any) {
            console.error(`[Comparison] Error processing period ${currentPeriod}:`, error)
            // Continue with next period instead of failing completely
        }
    }

    await onProgress('All periods processed!', 100)

    // Log multi-period summary
    console.log(`[Comparison] ========================================`)
    console.log(`[Comparison] MULTI-PERIOD COMPARISON SUMMARY:`)
    console.log(`[Comparison]   Periods processed: ${periods.length}`)
    console.log(`[Comparison]   Total Records: ${aggregatedSummary.totalRecords}`)
    console.log(`[Comparison]   ✅ Valid (matching): ${aggregatedSummary.validRecords}`)
    console.log(`[Comparison]   ⚠️  Mismatched: ${aggregatedSummary.mismatchedRecords}`)
    console.log(`[Comparison]   ❌ Missing data: ${aggregatedSummary.missingRecords}`)
    console.log(`[Comparison] ========================================`)

    return {
        datasets: allDatasets,
        comparisonResults: allComparisonResults,
        summary: aggregatedSummary,
        periods: periods
    }
}
