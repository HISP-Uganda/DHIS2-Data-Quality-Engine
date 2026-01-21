export interface Schedule {
    id: string
    cron: string
    name: string
    enabled: boolean
}

export interface RunDQParams {
    sourceUrl: string
    sourceUser: string
    sourcePass: string
    dataElements: string[]
    datasetDC: string
    orgUnit: string | string[] // Support both single org unit and multiple org units
    period: string | string[]
    // Destination instance parameters
    destinationUrl?: string
    destinationUser?: string
    destinationPass?: string
    destinationDataset?: string
    destinationOrgUnit?: string | string[] // Support multiple destination org units
    // Data element mapping (source -> destination)
    dataElementMapping?: Record<string, string>
}

export function fetchSchedules(): Promise<Schedule[]> {
    return fetch('/api/schedules').then(r => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
    })
}

export function createSchedule(payload: {
    cron: string
    name: string
}): Promise<Schedule> {
    return fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...payload,
            orgUnit: '',
            period: '',
            enabled: true,
            // any other required fields your back-end expects
        }),
    }).then(r => {
        if (!r.ok) throw new Error(r.statusText)
        return r.json()
    })
}

export async function runDQ(params: RunDQParams) {
    console.log('[api.ts] → POST /api/run-dq', params)
    console.log('[api.ts] Making fetch request to http://localhost:4000/api/run-dq')

    try {
        // Create AbortController for timeout
        const controller = new AbortController()
        const timeout = setTimeout(() => {
            controller.abort()
        }, 300000) // 5 minute timeout

        const resp = await fetch('http://localhost:4000/api/run-dq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
            signal: controller.signal
        })

        clearTimeout(timeout)
        
        console.log('[api.ts] ← Response received, status:', resp.status)
        console.log('[api.ts] ← Response headers:', Object.fromEntries(resp.headers.entries()))
        
        if (!resp.ok) {
            console.log('[api.ts] ← Response not OK, getting error text...')
            const err = await resp.text().catch((textError) => {
                console.error('[api.ts] ← Error reading response text:', textError)
                return resp.statusText
            })
            console.log('[api.ts] ← Error response body:', err)
            
            // Parse error response to provide better error messages
            let errorMessage = `DQ run failed: ${resp.status} ${err}`
            let parsedError = null
            
            try {
                parsedError = JSON.parse(err)
            } catch (e) {
                // Error is not JSON, use as-is
            }
            
            if (parsedError && parsedError.error) {
                // Check for data element mapping conflicts
                if (parsedError.error.includes('Failed to post to destination') && 
                    parsedError.error.includes('Data element not found or not accessible')) {
                    
                    const missingElements = []
                    const elementMatches = parsedError.error.match(/Data element not found or not accessible: `([^`]+)`/g)
                    if (elementMatches) {
                        elementMatches.forEach((match: string) => {
                            const elementIdMatch = match.match(/`([^`]+)`/)
                            if (elementIdMatch) {
                                const elementId = elementIdMatch[1]
                                if (!missingElements.includes(elementId)) {
                                    missingElements.push(elementId)
                                }
                            }
                        })
                    }
                    
                    if (missingElements.length > 0) {
                        errorMessage = `Data Element Mapping Error: ${missingElements.length} data elements are missing or not accessible in the destination DHIS2 instance.\n\n` +
                                     `Missing elements: ${missingElements.slice(0, 5).join(', ')}${missingElements.length > 5 ? ` and ${missingElements.length - 5} more` : ''}\n\n` +
                                     `Solution: Edit your configuration and add mappings for these data elements, or verify that these elements exist in the destination instance.`
                    }
                } else {
                    errorMessage = parsedError.error
                }
            }
            
            throw new Error(errorMessage)
        }
        
        console.log('[api.ts] ← Response OK, parsing JSON...')
        const result = await resp.json()
        console.log('[api.ts] ← JSON response:', result)
        return result
        
    } catch (fetchError: any) {
        console.error('[api.ts] ← Fetch error:', fetchError)

        // Handle timeout specifically
        if (fetchError.name === 'AbortError') {
            throw new Error('Request timed out after 5 minutes. The DHIS2 server may be slow or unresponsive. Please try again or check your network connection.')
        }

        throw fetchError
    }
}

// DHIS2 metadata fetching functions
export interface DHIS2Dataset {
    id: string
    displayName: string
    dataSetElements?: Array<{
        dataElement: {
            id: string
            displayName: string
        }
    }>
}

export interface DHIS2DataElement {
    id: string
    displayName: string
    formName?: string
}

export interface DHIS2OrgUnit {
    id: string
    displayName: string
    level?: number
    parent?: { id: string }
}

export interface OrgUnitTreeNode {
    key: string
    value: string
    title: string
    id: string
    level: number
    children: OrgUnitTreeNode[]
}

export async function validateAuth(sourceUrl: string, sourceUser: string, sourcePass: string): Promise<{ success: boolean; user?: any }> {
    const resp = await fetch('http://localhost:4000/api/validate-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl, sourceUser, sourcePass }),
    })

    if (!resp.ok) {
        const error = await resp.json().catch(() => ({ error: 'Authentication failed' }))
        throw new Error(error.error || `Authentication failed: ${resp.status}`)
    }

    return await resp.json()
}

export async function fetchDatasets(sourceUrl: string, sourceUser: string, sourcePass: string): Promise<DHIS2Dataset[]> {
    const resp = await fetch('http://localhost:4000/api/get-datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl, sourceUser, sourcePass }),
    })

    if (!resp.ok) {
        throw new Error(`Failed to fetch datasets: ${resp.status}`)
    }

    const data = await resp.json()
    return data.dataSets || []
}

export async function fetchDatasetElements(sourceUrl: string, sourceUser: string, sourcePass: string, datasetId: string): Promise<DHIS2DataElement[]> {
    const resp = await fetch('http://localhost:4000/api/get-dataset-elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl, sourceUser, sourcePass, datasetId }),
    })
    
    if (!resp.ok) {
        throw new Error(`Failed to fetch dataset elements: ${resp.status}`)
    }
    
    const data = await resp.json()
    return data.dataSetElements?.map((dse: any) => dse.dataElement) || []
}

export async function fetchOrgUnits(sourceUrl: string, sourceUser: string, sourcePass: string): Promise<{ orgUnits: DHIS2OrgUnit[], orgUnitTree: OrgUnitTreeNode[] }> {
    const resp = await fetch('http://localhost:4000/api/get-org-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl, sourceUser, sourcePass }),
    })
    
    if (!resp.ok) {
        throw new Error(`Failed to fetch org units: ${resp.status}`)
    }
    
    const data = await resp.json()
    return {
        orgUnits: data.organisationUnits || [],
        orgUnitTree: data.orgUnitTree || []
    }
}

export async function checkDataAvailability(params: {
    sourceUrl: string
    sourceUser: string
    sourcePass: string
    datasetId: string
    orgUnitId: string
    period: string | string[]
}): Promise<{
    success: boolean
    checks: Array<{
        api: string
        status: number
        success: boolean
        dataCount?: number
        completed?: boolean
    }>
    summary: {
        datasetName: string
        orgUnitName: string
        period: string
        dataFound: boolean
        formCompleted: boolean
    }
}> {
    const resp = await fetch('http://localhost:4000/api/check-data-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    })
    
    if (!resp.ok) {
        throw new Error(`Failed to check data availability: ${resp.status}`)
    }
    
    return await resp.json()
}

export async function getDatasetData(params: {
    sourceUrl: string
    sourceUser: string
    sourcePass: string
    datasetId: string
    orgUnitId: string
    period: string | string[]
}): Promise<{
    dataValues: Array<{
        dataElement: string
        period: string
        orgUnit: string
        value: string
        lastUpdated?: string
    }>
}> {
    const resp = await fetch('http://localhost:4000/api/get-dataset-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    })
    
    if (!resp.ok) {
        throw new Error(`Failed to get dataset data: ${resp.status}`)
    }
    
    return await resp.json()
}

// ============================================================================
// COMPARISON CONFIGURATION MANAGEMENT FUNCTIONS
// ============================================================================

export interface ComparisonConfiguration {
    id: string
    name: string
    description?: string

    // Source system configuration
    sourceUrl: string
    sourceUser: string
    sourcePass: string
    selectedSourceDataset: string
    selectedSourceOrgUnits: string[]
    selectedSourceOrgNames: string[]
    selectedDataElements: string[]
    period: string | string[]

    // Destination system configuration
    destinationUrl: string
    destinationUser: string
    destinationPass: string
    selectedDestDataset: string
    selectedDestOrgUnits: string[]
    selectedDestOrgNames: string[]
    dataElementMapping: string
    
    // Org unit tree data for Quick Run
    sourceOrgUnitTree?: OrgUnitTreeNode[]
    destinationOrgUnitTree?: OrgUnitTreeNode[]
    
    // Comparison configuration
    selectedDatasets: string[]
    dataElementGroups: Array<{
        id: string
        logicalName: string
        elements: {
            [datasetId: string]: {
                id: string
                displayName: string
                datasetId: string
                datasetName: string
            } | null
        }
    }>
    
    createdAt: string
    updatedAt: string
    lastRunAt?: string
    isActive: boolean
}

export interface SavedConfigurationSummary {
    id: string
    name: string
    description?: string
    datasetCount: number
    groupCount: number
    createdAt: string
    lastRunAt?: string
    isActive: boolean
}

export async function getSavedConfigurations(): Promise<SavedConfigurationSummary[]> {
    const resp = await fetch('http://localhost:4000/api/comparison-configs')
    
    if (!resp.ok) {
        throw new Error(`Failed to get configurations: ${resp.status}`)
    }
    
    return await resp.json()
}

export async function getConfiguration(id: string, includePasswords: boolean = false): Promise<ComparisonConfiguration> {
    const url = includePasswords 
        ? `http://localhost:4000/api/comparison-configs/${id}?includePasswords=true`
        : `http://localhost:4000/api/comparison-configs/${id}`
    
    console.log(`[api.ts] Getting configuration ${id}, includePasswords: ${includePasswords}`)
    
    const resp = await fetch(url)
    
    if (!resp.ok) {
        throw new Error(`Failed to get configuration: ${resp.status}`)
    }
    
    return await resp.json()
}

export async function saveConfiguration(config: {
    name: string
    description?: string

    // Source system configuration
    sourceUrl: string
    sourceUser: string
    sourcePass: string
    selectedSourceDataset: string
    selectedSourceOrgUnits: string[]
    selectedSourceOrgNames: string[]
    selectedDataElements: string[]
    period: string | string[]

    // Destination system configuration
    destinationUrl: string
    destinationUser: string
    destinationPass: string
    selectedDestDataset: string
    selectedDestOrgUnits: string[]
    selectedDestOrgNames: string[]
    dataElementMapping: string
    
    // Comparison configuration
    selectedDatasets: string[]
    dataElementGroups: Array<{
        id: string
        logicalName: string
        elements: Record<string, any>
    }>
    isActive?: boolean
}): Promise<ComparisonConfiguration> {
    const resp = await fetch('http://localhost:4000/api/comparison-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    })
    
    if (!resp.ok) {
        const error = await resp.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || `Failed to save configuration: ${resp.status}`)
    }
    
    return await resp.json()
}

export async function updateConfiguration(id: string, updates: Partial<ComparisonConfiguration>): Promise<ComparisonConfiguration> {
    const resp = await fetch(`http://localhost:4000/api/comparison-configs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    })
    
    if (!resp.ok) {
        throw new Error(`Failed to update configuration: ${resp.status}`)
    }
    
    return await resp.json()
}

export async function deleteConfiguration(id: string): Promise<void> {
    const resp = await fetch(`http://localhost:4000/api/comparison-configs/${id}`, {
        method: 'DELETE',
    })
    
    if (!resp.ok) {
        throw new Error(`Failed to delete configuration: ${resp.status}`)
    }
}

export async function toggleConfigurationStatus(id: string): Promise<ComparisonConfiguration> {
    const resp = await fetch(`http://localhost:4000/api/comparison-configs/${id}/toggle`, {
        method: 'PATCH',
    })
    
    if (!resp.ok) {
        throw new Error(`Failed to toggle configuration: ${resp.status}`)
    }
    
    return await resp.json()
}

export async function runSavedConfiguration(id: string, params: {
    orgUnit: string
    period: string | string[]
}): Promise<{
    success: boolean
    message: string
    configurationId: string
    configurationName: string
    parameters: {
        orgUnit: string
        period: string
        datasets: string[]
        groups: number
    }
}> {
    const resp = await fetch(`http://localhost:4000/api/comparison-configs/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    })
    
    if (!resp.ok) {
        const error = await resp.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || `Failed to run configuration: ${resp.status}`)
    }
    
    return await resp.json()
}
