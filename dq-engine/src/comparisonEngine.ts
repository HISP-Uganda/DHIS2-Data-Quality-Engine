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
 * Perform dataset comparison synchronously
 * This is the core comparison logic extracted from DataComparisonModal.tsx
 */
export async function performDatasetComparisonSync(
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
            orgUnitName,
            period,
            values,
            status,
            variance,
        })
    }

    await onProgress('Calculating summary statistics...', 95)

    // Calculate summary
    const summary = {
        totalRecords: comparisonResults.length,
        validRecords: comparisonResults.filter(r => r.status === 'valid').length,
        mismatchedRecords: comparisonResults.filter(r => r.status === 'mismatch').length,
        missingRecords: comparisonResults.filter(r => r.status === 'missing').length,
        outOfRangeRecords: 0,
    }

    await onProgress('Comparison complete!', 100)

    return {
        datasets: datasetDetails,
        comparisonResults,
        summary,
    }
}
