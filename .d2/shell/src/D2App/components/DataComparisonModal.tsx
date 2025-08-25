import React, { useState, useEffect, useMemo } from 'react'
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton,
    Box, Heading, Text, VStack, HStack, Badge, Table, Thead, Tbody, Tr, Th, Td,
    Button, useToast, Flex, Icon, Select, InputGroup, InputLeftElement, Input,
    Divider, Stat, StatLabel, StatNumber, StatHelpText, SimpleGrid,
    Checkbox, CheckboxGroup, Stack, Progress, Alert, AlertIcon, Spinner,
    Card, CardBody, CircularProgress, Accordion, AccordionItem, AccordionButton,
    AccordionPanel, AccordionIcon, IconButton, Tooltip,
} from '@chakra-ui/react'
import { FaCheck, FaExclamationTriangle, FaSearch, FaDownload, FaRedo, FaPlay, FaExclamationCircle, FaQuestionCircle, FaPlus, FaTrash, FaMagic, FaSave, FaCog, FaBookmark } from 'react-icons/fa'
import { useQuery, useMutation } from '@tanstack/react-query'
import { saveConfiguration, getSavedConfigurations, runSavedConfiguration, type SavedConfigurationSummary, type OrgUnitTreeNode } from '../api'

interface Dataset {
    id: string
    displayName: string
}

interface DataElementDetail {
    id: string
    displayName: string
    datasetId: string
    datasetName: string
}

interface DataElementGroup {
    id: string
    logicalName: string
    elements: {
        [datasetId: string]: DataElementDetail | null
    }
}

interface ComparisonResult {
    logicalDataElement: string  // Combined name representing the logical data element
    dataElementGroup: {         // Group of data elements representing the same logical concept
        dataset1: { id: string; name: string } | null
        dataset2: { id: string; name: string } | null  
        dataset3: { id: string; name: string } | null
    }
    orgUnit: string
    orgUnitName: string
    period: string
    values: {
        dataset1Value: string | null
        dataset2Value: string | null
        dataset3Value: string | null
    }
    suggestedCorrectValue: string | null  // Most common value or null if no consensus
    status: 'valid' | 'mismatch' | 'missing' | 'out_of_range'
    conflicts: string[]
}

interface DataComparisonModalProps {
    isOpen: boolean
    onClose: () => void
    
    // Source system data from DQ form
    sourceUrl: string
    sourceUser: string
    sourcePass: string
    selectedSourceDataset: string
    selectedSourceOrgUnits: string[]
    selectedSourceOrgNames: string[]
    selectedDataElements: string[]
    period: string
    
    // Destination system data from DQ form
    destinationUrl: string
    destinationUser: string
    destinationPass: string
    destinationOrgUnit: string
    targetDatasetId: string
    selectedDestOrgUnits: string[]
    selectedDestOrgNames: string[]
    dataElementMapping: string
    
    // Org unit tree data from DQ form
    sourceOrgUnitTree?: OrgUnitTreeNode[]
    destinationOrgUnitTree?: OrgUnitTreeNode[]
    
    // Flag to indicate this is a Quick Run (skip save configuration modal, pre-populate form)
    isQuickRun?: boolean
    quickRunSelectedDatasets?: string[] // Pre-selected datasets for Quick Run
    quickRunDataElementGroups?: DataElementGroup[] // Pre-saved data element groups for Quick Run
    
    onConfigurationComplete?: (selectedDatasets: string[], dataElementGroups: any[]) => void
}

// Function to create automatic initial data element mappings based on name similarity
const createAutomaticMapping = (datasetDetails: any[]): DataElementGroup[] => {
    const groups: DataElementGroup[] = []
    
    // Get the maximum number of data elements across all datasets
    const maxElements = Math.max(...datasetDetails.map(ds => ds.dataSetElements?.length || 0))
    
    // Create groups by position with automatic name matching
    for (let position = 0; position < maxElements; position++) {
        const group: DataElementGroup = {
            id: `group_${groups.length + 1}`,
            logicalName: `Data Element Group ${groups.length + 1}`,
            elements: {}
        }
        
        // Initialize all dataset slots to null
        datasetDetails.forEach(dataset => {
            group.elements[dataset.id] = null
        })
        
        // Try to match elements by position and similarity
        datasetDetails.forEach(dataset => {
            const element = dataset.dataSetElements?.[position]
            if (element) {
                group.elements[dataset.id] = {
                    id: element.dataElement.id,
                    displayName: element.dataElement.displayName,
                    datasetId: dataset.id,
                    datasetName: dataset.displayName
                }
            }
        })
        
        // Only add group if at least one element exists
        const hasElements = Object.values(group.elements).some(el => el !== null)
        if (hasElements) {
            groups.push(group)
        }
    }
    
    return groups
}

// Simple name similarity calculation
const calculateNameSimilarity = (name1: string, name2: string): number => {
    const words1 = name1.toLowerCase().split(/\s+/)
    const words2 = name2.toLowerCase().split(/\s+/)
    
    let commonWords = 0
    words1.forEach(word1 => {
        if (words2.some(word2 => word1.includes(word2) || word2.includes(word1))) {
            commonWords++
        }
    })
    
    return commonWords / Math.max(words1.length, words2.length)
}

// Function to get available data elements for a specific dataset
const getAvailableElementsForDataset = (datasetId: string, allElements: DataElementDetail[], groups: DataElementGroup[]): DataElementDetail[] => {
    // Get elements that are already used in groups for this dataset
    const usedElementIds = new Set<string>()
    groups.forEach(group => {
        const element = group.elements[datasetId]
        if (element) {
            usedElementIds.add(element.id)
        }
    })
    
    // Return unused elements for this dataset
    return allElements.filter(element => element.datasetId === datasetId && !usedElementIds.has(element.id))
}

// Function to find the most common value (consensus)
const findConsensusValue = (values: (string | null)[]): string | null => {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '')
    if (nonNullValues.length === 0) return null
    
    const valueCounts = new Map<string, number>()
    nonNullValues.forEach(value => {
        valueCounts.set(value, (valueCounts.get(value) || 0) + 1)
    })
    
    let maxCount = 0
    let consensusValue = null
    
    for (const [value, count] of valueCounts) {
        if (count > maxCount) {
            maxCount = count
            consensusValue = value
        }
    }
    
    // Only return consensus if it appears more than once OR is the only value
    return (maxCount > 1 || nonNullValues.length === 1) ? consensusValue : null
}

// Business rule validation function
const validateBusinessRules = (value: string, dataElementName: string): { isValid: boolean; error?: string } => {
    if (!value || value.trim() === '') return { isValid: true }
    
    const numValue = parseFloat(value)
    
    // Basic numeric validation
    if (isNaN(numValue)) {
        // Allow text values, but check for suspicious patterns
        if (value.length > 500) {
            return { isValid: false, error: 'Value too long (>500 characters)' }
        }
        return { isValid: true }
    }
    
    // Numeric range validations based on common data element patterns
    if (numValue < 0) {
        return { isValid: false, error: 'Negative value not allowed' }
    }
    
    // Population-related data elements
    if (dataElementName.toLowerCase().includes('population') && numValue > 10000000) {
        return { isValid: false, error: 'Population value seems too high' }
    }
    
    // Percentage values
    if (dataElementName.toLowerCase().includes('percent') || dataElementName.toLowerCase().includes('rate')) {
        if (numValue > 100) {
            return { isValid: false, error: 'Percentage/rate cannot exceed 100%' }
        }
    }
    
    // Very large values that might indicate data entry errors
    if (numValue > 999999999) {
        return { isValid: false, error: 'Value seems unreasonably large' }
    }
    
    return { isValid: true }
}


// Helper to get API base URL
const getApiBaseUrl = () => {
    return process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : ''
}

// API function to fetch available datasets
const fetchAvailableDatasets = async (
    destinationUrl: string,
    destinationUser: string,
    destinationPass: string
): Promise<Dataset[]> => {
    // Use the existing backend API endpoint that handles DHIS2 authentication
    const response = await fetch(`${getApiBaseUrl()}/api/get-datasets`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            sourceUrl: destinationUrl,
            sourceUser: destinationUser,
            sourcePass: destinationPass
        })
    })

    if (!response.ok) {
        throw new Error(`Failed to fetch datasets: ${response.status}`)
    }

    const data = await response.json()
    return data.dataSets || []
}

// API function to perform dataset comparison
const performDatasetComparison = async (
    destinationUrl: string,
    destinationUser: string,
    destinationPass: string,
    orgUnit: string,
    period: string,
    selectedDatasetIds: string[],
    dataElementGroups: DataElementGroup[],
    onProgress: (step: string, progress: number) => void,
    isQuickRun?: boolean // Flag to use saved data element groups directly
): Promise<{
    datasets: Dataset[]
    comparisonResults: ComparisonResult[]
    summary: {
        totalRecords: number
        validRecords: number
        mismatchedRecords: number
        missingRecords: number
        outOfRangeRecords: number
    }
}> => {
    console.log(`[performDatasetComparison] Starting comparison for isQuickRun=${isQuickRun}`)
    console.log(`[performDatasetComparison] Parameters:`, {
        destinationUrl,
        destinationUser,
        orgUnit,
        period,
        selectedDatasetIds,
        dataElementGroupsCount: dataElementGroups.length
    })
    
    if (isQuickRun) {
        console.log(`[performDatasetComparison] Quick Run detected - this should use exact same parameters as successful manual flow`)
        console.log(`[performDatasetComparison] If this fails, the saved configuration doesn't match the working manual parameters`)
        console.log(`[performDatasetComparison] Quick Run querying: ${destinationUrl} with datasets:`, selectedDatasetIds)
    } else {
        console.log(`[performDatasetComparison] Manual flow - these parameters should be saved exactly for Quick Run`)
        console.log(`[performDatasetComparison] Manual flow querying: ${destinationUrl} with datasets:`, selectedDatasetIds)
    }
    
    // URLs cleaned for consistency (no longer needed for direct calls)
    
    onProgress('Preparing dataset information...', 10)
    
    // Create dataset details based on data element groups
    const datasetDetails = []
    if (isQuickRun) {
        console.log('Quick Run: Creating dataset details from data element groups')
        // For Quick Run, create dataset details directly from data element groups
        for (const datasetId of selectedDatasetIds) {
            // Get dataset name from first group that has this dataset
            let datasetDisplayName = `Dataset ${datasetId}` // Better fallback than UID
            const dataSetElements: any[] = []
            
            for (const group of dataElementGroups) {
                const element = group.elements[datasetId]
                if (element) {
                    // Use the dataset name from the element, try multiple fields
                    if (element.datasetName && element.datasetName !== datasetId) {
                        datasetDisplayName = element.datasetName
                    } else if (element.displayName && element.displayName !== datasetId) {
                        datasetDisplayName = element.displayName
                    } else if (element.name && element.name !== datasetId) {
                        datasetDisplayName = element.name
                    }
                    
                    dataSetElements.push({
                        dataElement: {
                            id: element.id,
                            displayName: element.displayName
                        }
                    })
                }
            }
            
            const dataset = {
                id: datasetId,
                displayName: datasetDisplayName,
                dataSetElements
            }
            datasetDetails.push(dataset)
            console.log(`Quick Run: Created dataset "${datasetDisplayName}" (${datasetId}) with ${dataSetElements.length} elements`)
        }
    } else {
        // Fetch dataset details using backend API (for non-Quick Run scenarios)
        for (const datasetId of selectedDatasetIds) {
            try {
                const response = await fetch(`${getApiBaseUrl()}/api/get-dataset-elements`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sourceUrl: destinationUrl,
                        sourceUser: destinationUser,
                        sourcePass: destinationPass,
                        datasetId: datasetId
                    })
                })
                if (response.ok) {
                    const data = await response.json()
                    // Transform to match expected structure
                    const dataset = {
                        id: datasetId,
                        displayName: data.displayName || datasetId,
                        dataSetElements: data.dataSetElements || []
                    }
                    datasetDetails.push(dataset)
                }
            } catch (error) {
                console.error(`Error fetching dataset ${datasetId}:`, error)
            }
        }
    }
    
    onProgress('Fetching data element values from datasets...', 30)
    
    // Fetch data values for each dataset
    const dataValuesByDataset: { [datasetId: string]: any[] } = {}
    let datasetIndex = 0
    
    for (const dataset of datasetDetails) {
        onProgress(`Fetching data element values from ${dataset.displayName}...`, 30 + (datasetIndex * 20))
        
        try {
            console.log(`[DataComparisonModal] Querying dataset ${dataset.displayName} (${dataset.id}) for orgUnit=${orgUnit}, period=${period}`)
            console.log(`[DataComparisonModal] Using server: ${destinationUrl}, user: ${destinationUser}`)
            console.log(`[DataComparisonModal] Full request payload:`, {
                sourceUrl: destinationUrl,
                sourceUser: destinationUser,
                sourcePass: destinationPass ? '***' : 'undefined',
                datasetId: dataset.id,
                orgUnitId: orgUnit,
                period: period
            })
            console.log(`[DataComparisonModal] CRITICAL: About to query ${destinationUrl} for data - this should match the working manual flow exactly`)
            console.log(`[DataComparisonModal] CRITICAL: If this is Quick Run and returns 0 data, the saved config has wrong server/dataset combination`)
            console.log(`[DataComparisonModal] CRITICAL: Manual flow that works should use same server=${destinationUrl}, dataset=${dataset.id}, orgUnit=${orgUnit}, period=${period}`)
            // Use backend API to fetch data values through proper authentication
            const response = await fetch(`${getApiBaseUrl()}/api/get-dataset-data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceUrl: destinationUrl,
                    sourceUser: destinationUser,
                    sourcePass: destinationPass,
                    datasetId: dataset.id,
                    orgUnitId: orgUnit,
                    period: period
                })
            })
            
            if (response.ok) {
                const data = await response.json()
                const dataValues = data.dataValues || []
                console.log(`[DataComparisonModal] Dataset ${dataset.id} returned ${dataValues.length} data values`)
                if (dataValues.length === 0) {
                    console.log(`[DataComparisonModal] No data found for dataset ${dataset.id}, orgUnit ${orgUnit}, period ${period}`)
                }
                dataValuesByDataset[dataset.id] = dataValues
            } else {
                console.log(`[DataComparisonModal] HTTP error ${response.status} for dataset ${dataset.id}`)
                dataValuesByDataset[dataset.id] = []
            }
        } catch (error) {
            console.error(`Error fetching data for dataset ${dataset.displayName}:`, error)
            dataValuesByDataset[dataset.id] = []
        }
        datasetIndex++
    }
    
    onProgress('Comparing data element values across datasets...', 80)
    
    // Use user-defined data element mappings
    const comparisonResults: ComparisonResult[] = []
    
    // Get org unit name - using ID for now to avoid direct API calls
    // In a production environment, you could enhance the backend API to include org unit names
    const orgUnitName = orgUnit
    
    onProgress('Analyzing data element value differences...', 90)
    
    // Process each user-defined data element group
    for (const group of dataElementGroups) {
        // Get values for each dataset's data element in this group
        const values = []
        const dataElementGroup = { dataset1: null, dataset2: null, dataset3: null }
        
        for (let i = 0; i < Math.min(3, selectedDatasetIds.length); i++) {
            const datasetId = selectedDatasetIds[i]
            const elementInGroup = group.elements[datasetId]
            
            if (elementInGroup) {
                // Store data element info for this dataset
                dataElementGroup[`dataset${i + 1}` as keyof typeof dataElementGroup] = {
                    id: elementInGroup.id,
                    name: elementInGroup.displayName
                }
                
                // Find the value for this data element in this dataset
                const dataValues = dataValuesByDataset[datasetId] || []
                const dataValue = dataValues.find(
                    dv => dv.dataElement === elementInGroup.id &&
                          dv.orgUnit === orgUnit &&
                          dv.period === period
                )
                values.push(dataValue?.value || null)
            } else {
                values.push(null)
            }
        }
        
        // Pad values array to ensure we have 3 values
        while (values.length < 3) {
            values.push(null)
        }
        
        const [dataset1Value, dataset2Value, dataset3Value] = values
        
        // Find consensus value (most common non-null value)
        const suggestedCorrectValue = findConsensusValue(values)
        
        let status: 'valid' | 'mismatch' | 'missing' | 'out_of_range'
        let conflicts: string[] = []
        
        const allValues = [dataset1Value, dataset2Value, dataset3Value]
        const nonNullValues = allValues.filter(v => v !== null && v !== undefined && v !== '')
        
        // Check for missing values
        if (nonNullValues.length === 0) {
            status = 'missing'
            conflicts = ['❗ No data found in any dataset']
        } else if (nonNullValues.length < allValues.length) {
            // Some values are missing
            status = 'missing'
            const missingDatasets: string[] = []
            if (!dataset1Value && datasetDetails[0]) missingDatasets.push(datasetDetails[0]?.displayName)
            if (!dataset2Value && datasetDetails[1]) missingDatasets.push(datasetDetails[1]?.displayName)
            if (!dataset3Value && datasetDetails[2]) missingDatasets.push(datasetDetails[2]?.displayName)
            conflicts = [`❗ Missing values in: ${missingDatasets.join(', ')}`]
        } else {
            // All datasets have values - check for business rule violations first
            let hasRuleViolation = false
            allValues.forEach((value, datasetIndex) => {
                if (value !== null && value !== undefined && value !== '') {
                    const validation = validateBusinessRules(value, group.logicalName)
                    if (!validation.isValid) {
                        hasRuleViolation = true
                        const datasetName = datasetDetails[datasetIndex]?.displayName || `Dataset ${datasetIndex + 1}`
                        conflicts.push(`❓ ${datasetName}: ${validation.error} (value: "${value}")`)
                    }
                }
            })
            
            if (hasRuleViolation) {
                status = 'out_of_range'
            } else {
                // Check if all values are the same
                const uniqueValues = new Set(nonNullValues)
                if (uniqueValues.size === 1) {
                    status = 'valid'
                } else {
                    status = 'mismatch'
                    // Create mismatch descriptions with suggested correct value
                    if (dataset1Value && dataset2Value && dataset1Value !== dataset2Value) {
                        conflicts.push(`⚠️ ${datasetDetails[0]?.displayName}: "${dataset1Value}" ≠ ${datasetDetails[1]?.displayName}: "${dataset2Value}"`)
                    }
                    if (dataset1Value && dataset3Value && dataset1Value !== dataset3Value && datasetDetails[2]) {
                        conflicts.push(`⚠️ ${datasetDetails[0]?.displayName}: "${dataset1Value}" ≠ ${datasetDetails[2]?.displayName}: "${dataset3Value}"`)
                    }
                    if (dataset2Value && dataset3Value && dataset2Value !== dataset3Value && datasetDetails[1] && datasetDetails[2]) {
                        conflicts.push(`⚠️ ${datasetDetails[1]?.displayName}: "${dataset2Value}" ≠ ${datasetDetails[2]?.displayName}: "${dataset3Value}"`)
                    }
                    
                    // Add suggested correct value if consensus found
                    if (suggestedCorrectValue) {
                        conflicts.push(`💡 Suggested correct value: "${suggestedCorrectValue}" (most common)`)
                    }
                }
            }
        }
        
        comparisonResults.push({
            logicalDataElement: group.logicalName,
            dataElementGroup,
            orgUnit,
            orgUnitName,
            period,
            values: {
                dataset1Value,
                dataset2Value,
                dataset3Value
            },
            suggestedCorrectValue,
            status,
            conflicts
        })
    }
    
    onProgress('Completed!', 100)
    
    // Calculate summary with new status categories
    const summary = {
        totalRecords: comparisonResults.length,
        validRecords: comparisonResults.filter(r => r.status === 'valid').length,
        mismatchedRecords: comparisonResults.filter(r => r.status === 'mismatch').length,
        missingRecords: comparisonResults.filter(r => r.status === 'missing').length,
        outOfRangeRecords: comparisonResults.filter(r => r.status === 'out_of_range').length
    }
    
    return {
        datasets: datasetDetails.map(ds => ({ id: ds.id, displayName: ds.displayName })),
        comparisonResults,
        summary
    }
}

export default function DataComparisonModal({
    isOpen,
    onClose,
    
    // Source system data from DQ form
    sourceUrl,
    sourceUser,
    sourcePass,
    selectedSourceDataset,
    selectedSourceOrgUnits,
    selectedSourceOrgNames,
    selectedDataElements,
    period,
    
    // Destination system data from DQ form
    destinationUrl,
    destinationUser,
    destinationPass,
    destinationOrgUnit,
    targetDatasetId,
    selectedDestOrgUnits,
    selectedDestOrgNames,
    dataElementMapping,
    
    // Org unit tree data from DQ form
    sourceOrgUnitTree,
    destinationOrgUnitTree,
    
    // Flag to indicate this is a Quick Run (skip save configuration modal)
    isQuickRun = false,
    quickRunSelectedDatasets,
    quickRunDataElementGroups,
    
    onConfigurationComplete
}: DataComparisonModalProps) {
    const toast = useToast()
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'mismatch' | 'missing' | 'out_of_range'>('all')
    const [comparisonResults, setComparisonResults] = useState<any>(null)
    const [currentStep, setCurrentStep] = useState('')
    const [progress, setProgress] = useState(0)
    const [dataElementGroups, setDataElementGroups] = useState<DataElementGroup[]>([])
    const [availableDataElements, setAvailableDataElements] = useState<DataElementDetail[]>([])
    const [showMappingInterface, setShowMappingInterface] = useState(false)
    const [datasetDetails, setDatasetDetails] = useState<any[]>([])
    
    // Configuration management state
    const [showSaveConfig, setShowSaveConfig] = useState(false)
    const [configName, setConfigName] = useState('')
    const [configDescription, setConfigDescription] = useState('')
    const [showLoadConfig, setShowLoadConfig] = useState(false)
    const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
    const [showStep2SaveModal, setShowStep2SaveModal] = useState(false)

    // Query to fetch available datasets (skip for Quick Run to avoid server errors)
    const { data: availableDatasets = [], isLoading: loadingDatasets, error: datasetsError } = useQuery({
        queryKey: ['available-datasets', destinationUrl, destinationUser],
        queryFn: () => fetchAvailableDatasets(destinationUrl, destinationUser, destinationPass),
        enabled: isOpen && !isQuickRun, // Skip fetching for Quick Run
        staleTime: 5 * 60 * 1000,
    })

    // Query to fetch saved configurations
    const { data: savedConfigurations = [], isLoading: loadingConfigs, refetch: refetchConfigs } = useQuery({
        queryKey: ['saved-configurations'],
        queryFn: getSavedConfigurations,
        enabled: isOpen,
        staleTime: 2 * 60 * 1000,
    })

    // Mutation for performing comparison
    const comparisonMutation = useMutation({
        mutationFn: async (datasetIds: string[]) => {
            return performDatasetComparison(
                destinationUrl,
                destinationUser,
                destinationPass,
                destinationOrgUnit,
                period,
                datasetIds,
                dataElementGroups,
                (step: string, progressValue: number) => {
                    setCurrentStep(step)
                    setProgress(progressValue)
                },
                isQuickRun // Pass Quick Run flag to use saved data element groups
            )
        },
        onSuccess: (data) => {
            setComparisonResults(data)
            
            // Track comparison statistics
            fetch(`${getApiBaseUrl()}/api/comparison-stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    datasets: selectedDatasets,
                    totalRecords: data.summary.totalRecords,
                    validRecords: data.summary.validRecords,
                    mismatchedRecords: data.summary.mismatchedRecords,
                    missingRecords: data.summary.missingRecords,
                    outOfRangeRecords: data.summary.outOfRangeRecords,
                    consensusFound: data.summary.validRecords // Assuming valid means consensus found
                })
            }).catch(err => console.warn('Failed to track comparison stats:', err))
            
            toast({
                title: 'Comparison Complete!',
                description: `Compared ${data.summary.totalRecords} data elements: ${data.summary.validRecords} valid, ${data.summary.mismatchedRecords} mismatched, ${data.summary.missingRecords} missing, ${data.summary.outOfRangeRecords} out of range`,
                status: 'success',
                duration: 4000
            })
        },
        onError: (error: Error) => {
            toast({
                title: 'Comparison Failed',
                description: error.message,
                status: 'error',
                duration: 5000
            })
        }
    })

    // Mutation for saving configuration
    const saveConfigMutation = useMutation({
        mutationFn: async (configData: {
            name: string
            description?: string
        }) => {
            return saveConfiguration({
                name: configData.name,
                description: configData.description,
                
                // Source system configuration from DQ form
                sourceUrl,
                sourceUser,
                sourcePass,
                selectedSourceDataset,
                selectedSourceOrgUnits,
                selectedSourceOrgNames,
                selectedDataElements,
                period,
                
                // Destination system configuration from DQ form
                destinationUrl,
                destinationUser,
                destinationPass,
                selectedDestDataset: targetDatasetId,
                selectedDestOrgUnits,
                selectedDestOrgNames,
                dataElementMapping,
                
                // Org unit tree data for Quick Run
                sourceOrgUnitTree,
                destinationOrgUnitTree,
                
                // Comparison configuration
                selectedDatasets,
                dataElementGroups,
                isActive: true
            })
        },
        onSuccess: () => {
            toast({
                title: 'Configuration Saved!',
                description: `Configuration "${configName}" has been saved successfully`,
                status: 'success',
                duration: 3000
            })
            setShowSaveConfig(false)
            setConfigName('')
            setConfigDescription('')
            refetchConfigs()
            
            // If this is being used in the configuration wizard, notify completion
            if (onConfigurationComplete) {
                onConfigurationComplete(selectedDatasets, dataElementGroups)
            }
        },
        onError: (error: Error) => {
            toast({
                title: 'Save Failed',
                description: error.message,
                status: 'error',
                duration: 4000
            })
        }
    })

    // Mutation for running saved configuration
    const runSavedConfigMutation = useMutation({
        mutationFn: async (configId: string) => {
            return runSavedConfiguration(configId, {
                orgUnit: destinationOrgUnit,
                period
            })
        },
        onSuccess: (data) => {
            toast({
                title: 'Configuration Started!',
                description: data.message,
                status: 'success',
                duration: 4000
            })
            setShowLoadConfig(false)
            // Could trigger a comparison result view here
        },
        onError: (error: Error) => {
            toast({
                title: 'Run Failed',
                description: error.message,
                status: 'error',
                duration: 4000
            })
        }
    })

    // Pre-select target dataset and ensure we have at least 3 datasets (skip for Quick Run)
    useEffect(() => {
        if (!isQuickRun && availableDatasets.length > 0 && selectedDatasets.length === 0) {
            const targetDataset = availableDatasets.find(ds => ds.id === targetDatasetId)
            const otherDatasets = availableDatasets.filter(ds => ds.id !== targetDatasetId).slice(0, 2)
            
            let preSelected = []
            if (targetDataset) {
                preSelected.push(targetDataset.id)
            }
            preSelected.push(...otherDatasets.map(ds => ds.id))
            
            // Ensure we have at least 3 datasets selected
            if (preSelected.length < 3 && availableDatasets.length >= 3) {
                preSelected = availableDatasets.slice(0, 3).map(ds => ds.id)
            }
            
            setSelectedDatasets(preSelected)
        }
    }, [availableDatasets, targetDatasetId, isQuickRun])
    
    // For Quick Run, pre-select datasets and load saved data element groups
    useEffect(() => {
        if (isQuickRun && quickRunSelectedDatasets?.length && selectedDatasets.length === 0) {
            console.log('Quick Run: Pre-selecting datasets:', quickRunSelectedDatasets)
            setSelectedDatasets(quickRunSelectedDatasets)
            
            // Load pre-saved data element groups
            if (quickRunDataElementGroups?.length) {
                console.log('Quick Run: Loading pre-saved data element groups:', quickRunDataElementGroups)
                setDataElementGroups(quickRunDataElementGroups)
            }
            
            // Automatically proceed to mapping interface for Quick Run
            setShowMappingInterface(true)
        }
    }, [isQuickRun, quickRunSelectedDatasets, quickRunDataElementGroups, selectedDatasets.length])
    
    // Create proper datasets for Quick Run with real names from data element groups
    const datasetsToShow = useMemo(() => {
        if (isQuickRun && quickRunSelectedDatasets?.length && quickRunDataElementGroups?.length) {
            return quickRunSelectedDatasets.map(datasetId => {
                // Find the real dataset name from the first data element group
                const firstGroup = quickRunDataElementGroups[0]
                const element = firstGroup?.elements?.[datasetId]
                const displayName = element?.datasetName || datasetId
                
                return {
                    id: datasetId,
                    displayName: displayName === datasetId ? `Dataset ${datasetId}` : displayName
                }
            })
        }
        return availableDatasets
    }, [isQuickRun, quickRunSelectedDatasets, quickRunDataElementGroups, availableDatasets])

    // Normal data element mapping logic (skip for Quick Run since we load pre-saved groups)
    useEffect(() => {
        if (!isQuickRun && selectedDatasets.length >= 2 && showMappingInterface && dataElementGroups.length === 0) {
            // Use normal fetching and mapping logic for non-Quick Run
            fetchDatasetDetailsAndCreateMapping()
        }
    }, [selectedDatasets, showMappingInterface, isQuickRun])
    
    // Show save modal when user reaches Step 2: Map data elements (skip for Quick Run)
    useEffect(() => {
        if (!isQuickRun && showMappingInterface && dataElementGroups.length > 0 && !showStep2SaveModal) {
            setShowStep2SaveModal(true)
        }
    }, [showMappingInterface, dataElementGroups.length, isQuickRun])
    
    const fetchDatasetDetailsAndCreateMapping = async () => {
        try {
            const details = []
            for (const datasetId of selectedDatasets) {
                try {
                    const response = await fetch(`${getApiBaseUrl()}/api/get-dataset-elements`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sourceUrl: destinationUrl,
                            sourceUser: destinationUser,
                            sourcePass: destinationPass,
                            datasetId: datasetId
                        })
                    })
                    if (response.ok) {
                        const data = await response.json()
                        // Transform to match expected structure
                        const dataset = {
                            id: datasetId,
                            displayName: data.displayName || datasetId,
                            dataSetElements: data.dataSetElements || []
                        }
                        details.push(dataset)
                    }
                } catch (error) {
                    console.error(`Error fetching dataset ${datasetId}:`, error)
                }
            }
            
            setDatasetDetails(details)
            
            // Create automatic mapping
            const autoGroups = createAutomaticMapping(details)
            setDataElementGroups(autoGroups)
            
            // Collect all available data elements
            const allElements: DataElementDetail[] = []
            details.forEach(dataset => {
                dataset.dataSetElements?.forEach((element: any) => {
                    allElements.push({
                        id: element.dataElement.id,
                        displayName: element.dataElement.displayName,
                        datasetId: dataset.id,
                        datasetName: dataset.displayName
                    })
                })
            })
            setAvailableDataElements(allElements)
            
            setShowMappingInterface(true)
        } catch (error) {
            console.error('Error fetching dataset details:', error)
        }
    }

    const handleStartComparison = () => {
        if (selectedDatasets.length < 2) {
            toast({
                title: 'Selection Required',
                description: 'Please select at least 2 datasets to compare',
                status: 'warning',
                duration: 3000
            })
            return
        }
        
        if (dataElementGroups.length === 0) {
            toast({
                title: 'Mapping Required',
                description: 'Please create at least one data element group mapping',
                status: 'warning',
                duration: 3000
            })
            return
        }
        
        setComparisonResults(null)
        setProgress(0)
        setCurrentStep('')
        setShowMappingInterface(false)
        comparisonMutation.mutate(selectedDatasets)
    }
    
    const addNewGroup = () => {
        const newGroup: DataElementGroup = {
            id: `group_${dataElementGroups.length + 1}`,
            logicalName: `Data Element Group ${dataElementGroups.length + 1}`,
            elements: {}
        }
        
        // Initialize all dataset slots to null
        selectedDatasets.forEach(datasetId => {
            newGroup.elements[datasetId] = null
        })
        
        setDataElementGroups([...dataElementGroups, newGroup])
    }
    
    const removeGroup = (groupId: string) => {
        setDataElementGroups(dataElementGroups.filter(group => group.id !== groupId))
    }
    
    const updateGroupName = (groupId: string, newName: string) => {
        setDataElementGroups(dataElementGroups.map(group => 
            group.id === groupId ? { ...group, logicalName: newName } : group
        ))
    }
    
    const setElementForGroup = (groupId: string, datasetId: string, element: DataElementDetail | null) => {
        // Remove this element from other groups first if it exists
        let updatedGroups = dataElementGroups.map(group => {
            const newElements = { ...group.elements }
            // Remove this element from other dataset slots in other groups
            Object.keys(newElements).forEach(dsId => {
                if (newElements[dsId]?.id === element?.id && group.id !== groupId) {
                    newElements[dsId] = null
                }
            })
            return { ...group, elements: newElements }
        })
        
        // Set element in target group and dataset slot
        updatedGroups = updatedGroups.map(group => 
            group.id === groupId 
                ? { 
                    ...group, 
                    elements: {
                        ...group.elements,
                        [datasetId]: element
                    }
                }
                : group
        )
        
        setDataElementGroups(updatedGroups)
    }
    
    const removeElementFromGroup = (groupId: string, datasetId: string) => {
        setDataElementGroups(dataElementGroups.map(group => 
            group.id === groupId 
                ? { 
                    ...group, 
                    elements: {
                        ...group.elements,
                        [datasetId]: null
                    }
                }
                : group
        ))
    }
    
    const regenerateAutoMapping = () => {
        if (datasetDetails.length > 0) {
            const autoGroups = createAutomaticMapping(datasetDetails)
            setDataElementGroups(autoGroups)
            toast({
                title: 'Mapping Regenerated',
                description: `Created ${autoGroups.length} automatic data element groups`,
                status: 'success',
                duration: 3000
            })
        }
    }

    const handleExport = () => {
        if (!comparisonResults) return

        const csvContent = [
            ['Logical Data Element', 'Org Unit', 'Period', ...comparisonResults.datasets.map((ds: Dataset) => ds.displayName), 'Suggested Value', 'Status', 'Conflicts'].join(','),
            ...comparisonResults.comparisonResults.map((result: ComparisonResult) => [
                result.logicalDataElement,
                result.orgUnitName,
                result.period,
                result.values.dataset1Value || '',
                result.values.dataset2Value || '',
                result.values.dataset3Value || '',
                result.suggestedCorrectValue || '',
                result.status,
                result.conflicts.join('; ')
            ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dataset-comparison-${period}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
    }

    // Filter results based on search and status
    const filteredResults = comparisonResults?.comparisonResults.filter((result: ComparisonResult) => {
        const matchesSearch = !searchTerm || 
            result.logicalDataElement.toLowerCase().includes(searchTerm.toLowerCase()) ||
            result.orgUnitName.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesStatus = statusFilter === 'all' || result.status === statusFilter
        
        return matchesSearch && matchesStatus
    }) || []

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'valid':
                return <Icon as={FaCheck} color="green.500" />
            case 'mismatch':
                return <Icon as={FaExclamationTriangle} color="orange.500" />
            case 'missing':
                return <Icon as={FaExclamationCircle} color="red.500" />
            case 'out_of_range':
                return <Icon as={FaQuestionCircle} color="purple.500" />
            default:
                return null
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'valid': return 'green'
            case 'mismatch': return 'orange'
            case 'missing': return 'red'
            case 'out_of_range': return 'purple'
            default: return 'gray'
        }
    }

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'valid': return '✅ Valid'
            case 'mismatch': return '⚠️ Mismatch' 
            case 'missing': return '❗ Missing'
            case 'out_of_range': return '❓ Out of Range'
            default: return status
        }
    }

    const isComparing = comparisonMutation.isPending

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="6xl">
            <ModalOverlay />
            <ModalContent maxH="90vh" overflowY="auto">
                <ModalHeader>
                    <Flex alignItems="center" justifyContent="space-between">
                        <VStack align="start" spacing={1}>
                            <Text fontSize="lg" fontWeight="bold">Dataset Comparison Tool</Text>
                            <Text fontSize="sm" color="gray.600" fontWeight="normal">
                                {!showMappingInterface && !comparisonResults && 'Step 1: Select datasets to compare'}
                                {showMappingInterface && !comparisonResults && 'Step 2: Map data elements for comparison'}
                                {comparisonResults && 'Comparison Results'}
                            </Text>
                        </VStack>
                        <HStack spacing={2}>
                            {comparisonResults && (
                                <Button
                                    size="sm"
                                    leftIcon={<FaDownload />}
                                    onClick={handleExport}
                                    colorScheme="blue"
                                >
                                    Export CSV
                                </Button>
                            )}
                            
                            {/* Load Saved Configuration Button */}
                            <Button
                                size="sm"
                                leftIcon={<FaBookmark />}
                                onClick={() => setShowLoadConfig(true)}
                                colorScheme="purple"
                                variant="outline"
                            >
                                Load Config
                            </Button>
                            
                            {/* Save Configuration Button - only show when mapping interface is ready */}
                            {(showMappingInterface || comparisonResults) && dataElementGroups.length > 0 && (
                                <Button
                                    size="sm"
                                    leftIcon={<FaSave />}
                                    onClick={() => setShowSaveConfig(true)}
                                    colorScheme="green"
                                    variant="outline"
                                >
                                    Save Config
                                </Button>
                            )}
                        </HStack>
                    </Flex>
                </ModalHeader>
                <ModalCloseButton />
                <ModalBody pb={6}>
                    <VStack spacing={6} align="stretch">
                        {/* Dataset Selection Section */}
                        {!comparisonResults && !showMappingInterface && (
                            <Card borderWidth="2px" borderColor="blue.200">
                                <CardBody>
                                    <VStack spacing={4} align="stretch">
                                        <Heading size="md" color="blue.700">Step 1: Select Datasets to Compare</Heading>
                                        
                                        <Alert status="info" borderRadius="md">
                                            <AlertIcon />
                                            <VStack align="start" spacing={1}>
                                                <Text fontSize="sm" fontWeight="medium">Dataset selection is required before proceeding</Text>
                                                <Text fontSize="xs" color="gray.600">
                                                    Choose 2-3 datasets to compare <strong>data element values</strong> for the selected organization unit and period. 
                                                    The comparison will identify matching, mismatched, and missing values across datasets.
                                                </Text>
                                            </VStack>
                                        </Alert>
                                        
                                        {loadingDatasets ? (
                                            <Flex alignItems="center" justifyContent="center" py={8}>
                                                <VStack spacing={3}>
                                                    <Spinner size="lg" color="blue.500" />
                                                    <Text>Loading available datasets...</Text>
                                                </VStack>
                                            </Flex>
                                        ) : datasetsError ? (
                                            <Alert status="error">
                                                <AlertIcon />
                                                Failed to load datasets: {datasetsError.message}
                                            </Alert>
                                        ) : (
                                            <VStack spacing={4} align="stretch">
                                                <Box maxH="300px" overflowY="auto" border="1px solid #E2E8F0" borderRadius="md" p={3}>
                                                    <CheckboxGroup
                                                        value={selectedDatasets}
                                                        onChange={(values) => setSelectedDatasets(values as string[])}
                                                    >
                                                        <Stack spacing={2}>
                                                            {datasetsToShow.map((dataset) => (
                                                                <Checkbox key={dataset.id} value={dataset.id}>
                                                                    <Text fontSize="sm">
                                                                        {dataset.displayName}
                                                                        {dataset.id === targetDatasetId && (
                                                                            <Badge ml={2} colorScheme="blue" size="sm">Target</Badge>
                                                                        )}
                                                                    </Text>
                                                                </Checkbox>
                                                            ))}
                                                        </Stack>
                                                    </CheckboxGroup>
                                                </Box>
                                                
                                                <HStack>
                                                    <Text fontSize="sm" color="gray.600">
                                                        Selected: {selectedDatasets.length} dataset{selectedDatasets.length !== 1 ? 's' : ''}
                                                        {selectedDatasets.length < 2 && (
                                                            <Text as="span" color="red.500" fontWeight="medium"> (minimum 2 required)</Text>
                                                        )}
                                                    </Text>
                                                    <Button
                                                        leftIcon={<FaPlay />}
                                                        colorScheme="blue"
                                                        onClick={() => {
                                                            if (!isQuickRun && selectedDatasets.length < 2) {
                                                                toast({
                                                                    title: 'Dataset Selection Required',
                                                                    description: 'You must select at least 2 datasets before proceeding to data element mapping.',
                                                                    status: 'warning',
                                                                    duration: 4000
                                                                })
                                                                return
                                                            }
                                                            setShowMappingInterface(true)
                                                        }}
                                                        isDisabled={!isQuickRun && selectedDatasets.length < 2}
                                                        size="md"
                                                    >
                                                        {selectedDatasets.length < 2 ? 'Select Datasets First' : 'Next: Map Data Elements'}
                                                    </Button>
                                                </HStack>
                                            </VStack>
                                        )}
                                    </VStack>
                                </CardBody>
                            </Card>
                        )}

                        {/* Data Element Mapping Section */}
                        {!comparisonResults && showMappingInterface && (
                            <>
                                {/* Safety check - ensure datasets are selected */}
                                {!isQuickRun && selectedDatasets.length < 2 ? (
                                    <Card borderWidth="2px" borderColor="red.200">
                                        <CardBody>
                                            <Alert status="error">
                                                <AlertIcon />
                                                <VStack align="start" spacing={2}>
                                                    <Text fontWeight="medium">Dataset Selection Required</Text>
                                                    <Text fontSize="sm">
                                                        You must select at least 2 datasets before you can map data elements. 
                                                        Please go back to Step 1 and select your datasets first.
                                                    </Text>
                                                    <Button
                                                        size="sm"
                                                        colorScheme="blue"
                                                        onClick={() => {
                                                            setShowMappingInterface(false)
                                                            setDataElementGroups([])
                                                        }}
                                                    >
                                                        ← Go Back to Dataset Selection
                                                    </Button>
                                                </VStack>
                                            </Alert>
                                        </CardBody>
                                    </Card>
                                ) : (
                                    <Card borderWidth="2px" borderColor="green.200">
                                        <CardBody>
                                            <VStack spacing={4} align="stretch">
                                                <HStack justifyContent="space-between">
                                                    <Heading size="md" color="green.700">Step 2: Map Data Elements for Comparison</Heading>
                                            <HStack spacing={2}>
                                                <Tooltip label="Automatically group similar data elements">
                                                    <IconButton
                                                        aria-label="Auto map"
                                                        icon={<FaMagic />}
                                                        size="sm"
                                                        onClick={regenerateAutoMapping}
                                                        colorScheme="purple"
                                                        variant="outline"
                                                    />
                                                </Tooltip>
                                                <Button
                                                    leftIcon={<FaPlus />}
                                                    size="sm"
                                                    onClick={addNewGroup}
                                                    colorScheme="blue"
                                                >
                                                    Add Group
                                                </Button>
                                            </HStack>
                                        </HStack>
                                        
                                        <Text fontSize="sm" color="gray.600">
                                            Click "Add Group" then select corresponding data elements from each dataset using the dropdowns below. 
                                            Each row represents one logical data element that will be compared across datasets.
                                        </Text>

                                        {dataElementGroups.length > 0 ? (
                                            <VStack spacing={4} align="stretch">
                                                {/* Header row showing dataset names */}
                                                <HStack spacing={4} bg="gray.50" p={3} borderRadius="md">
                                                    <Box minW="200px">
                                                        <Text fontWeight="bold" fontSize="sm">Group Name</Text>
                                                    </Box>
                                                    {selectedDatasets.slice(0, 3).map((datasetId, index) => {
                                                        const dataset = datasetDetails.find(ds => ds.id === datasetId)
                                                        return (
                                                            <Box key={datasetId} flex="1" minW="200px">
                                                                <Text fontWeight="bold" fontSize="sm" color="blue.600">
                                                                    Dataset {index + 1}: {dataset?.displayName || datasetId}
                                                                </Text>
                                                            </Box>
                                                        )
                                                    })}
                                                    <Box minW="80px">
                                                        <Text fontWeight="bold" fontSize="sm">Actions</Text>
                                                    </Box>
                                                </HStack>

                                                {/* Group rows */}
                                                {dataElementGroups.map((group) => (
                                                    <HStack key={group.id} spacing={4} p={3} bg="white" border="1px" borderColor="gray.200" borderRadius="md">
                                                        <Box minW="200px">
                                                            <Input
                                                                value={group.logicalName}
                                                                onChange={(e) => updateGroupName(group.id, e.target.value)}
                                                                size="sm"
                                                                placeholder="Group name"
                                                                fontWeight="medium"
                                                            />
                                                        </Box>
                                                        
                                                        {/* Dropdown for each dataset */}
                                                        {selectedDatasets.slice(0, 3).map((datasetId) => {
                                                            const availableElements = getAvailableElementsForDataset(datasetId, availableDataElements, dataElementGroups)
                                                            const selectedElement = group.elements[datasetId]
                                                            
                                                            return (
                                                                <Box key={datasetId} flex="1" minW="200px">
                                                                    <Select
                                                                        placeholder="Select data element"
                                                                        size="sm"
                                                                        value={selectedElement?.id || ''}
                                                                        onChange={(e) => {
                                                                            const elementId = e.target.value
                                                                            if (elementId) {
                                                                                const element = availableElements.find(el => el.id === elementId)
                                                                                setElementForGroup(group.id, datasetId, element || null)
                                                                            } else {
                                                                                setElementForGroup(group.id, datasetId, null)
                                                                            }
                                                                        }}
                                                                    >
                                                                        {/* Show currently selected element even if not in available list */}
                                                                        {selectedElement && !availableElements.find(el => el.id === selectedElement.id) && (
                                                                            <option key={selectedElement.id} value={selectedElement.id}>
                                                                                {selectedElement.displayName}
                                                                            </option>
                                                                        )}
                                                                        {/* Show available elements */}
                                                                        {availableElements.map((element) => (
                                                                            <option key={element.id} value={element.id}>
                                                                                {element.displayName}
                                                                            </option>
                                                                        ))}
                                                                    </Select>
                                                                </Box>
                                                            )
                                                        })}
                                                        
                                                        <Box minW="80px">
                                                            <IconButton
                                                                aria-label="Remove group"
                                                                icon={<FaTrash />}
                                                                size="sm"
                                                                colorScheme="red"
                                                                variant="ghost"
                                                                onClick={() => removeGroup(group.id)}
                                                            />
                                                        </Box>
                                                    </HStack>
                                                ))}
                                            </VStack>
                                        ) : (
                                            <Alert status="info">
                                                <AlertIcon />
                                                No data element groups created yet. Click "Add Group" to start creating comparison groups.
                                            </Alert>
                                        )}

                                        {/* Action buttons */}
                                        <HStack justifyContent="space-between">
                                            <Button
                                                onClick={() => {
                                                    setShowMappingInterface(false)
                                                    setDataElementGroups([])
                                                }}
                                                variant="outline"
                                                colorScheme="blue"
                                            >
                                                ← Back to Dataset Selection (Required)
                                            </Button>
                                            
                                            <HStack>
                                                <Text fontSize="sm" color="gray.600">
                                                    {dataElementGroups.length} group{dataElementGroups.length !== 1 ? 's' : ''} configured
                                                </Text>
                                                <Button
                                                    leftIcon={<FaPlay />}
                                                    colorScheme="blue"
                                                    onClick={handleStartComparison}
                                                    isDisabled={dataElementGroups.length === 0}
                                                >
                                                    Start Comparison
                                                </Button>
                                            </HStack>
                                        </HStack>
                                    </VStack>
                                </CardBody>
                            </Card>
                                )}
                            </>
                        )}

                        {/* Progress Section */}
                        {isComparing && (
                            <Card>
                                <CardBody>
                                    <VStack spacing={4}>
                                        <Heading size="md">Comparison in Progress</Heading>
                                        <Box width="100%">
                                            <Text fontSize="sm" mb={2}>{currentStep}</Text>
                                            <Progress value={progress} colorScheme="blue" size="lg" borderRadius="md" />
                                            <Text fontSize="xs" color="gray.500" mt={1}>{Math.round(progress)}% Complete</Text>
                                        </Box>
                                        <HStack>
                                            <CircularProgress isIndeterminate color="blue.300" size="20px" />
                                            <Text fontSize="sm" color="gray.600">
                                                Comparing data element values across {selectedDatasets.length} datasets...
                                            </Text>
                                        </HStack>
                                    </VStack>
                                </CardBody>
                            </Card>
                        )}

                        {/* Results Section */}
                        {comparisonResults && (
                            <VStack spacing={6} align="stretch">
                                {/* Summary Statistics */}
                                <SimpleGrid columns={{ base: 2, md: 5 }} spacing={4}>
                                    <Stat>
                                        <StatLabel>Total Elements</StatLabel>
                                        <StatNumber>{comparisonResults.summary.totalRecords}</StatNumber>
                                    </Stat>
                                    <Stat>
                                        <StatLabel>✅ Valid</StatLabel>
                                        <StatNumber color="green.500">{comparisonResults.summary.validRecords}</StatNumber>
                                        <StatHelpText>
                                            {comparisonResults.summary.totalRecords > 0 
                                                ? Math.round((comparisonResults.summary.validRecords / comparisonResults.summary.totalRecords) * 100)
                                                : 0}%
                                        </StatHelpText>
                                    </Stat>
                                    <Stat>
                                        <StatLabel>⚠️ Mismatch</StatLabel>
                                        <StatNumber color="orange.500">{comparisonResults.summary.mismatchedRecords}</StatNumber>
                                        <StatHelpText>
                                            {comparisonResults.summary.totalRecords > 0 
                                                ? Math.round((comparisonResults.summary.mismatchedRecords / comparisonResults.summary.totalRecords) * 100)
                                                : 0}%
                                        </StatHelpText>
                                    </Stat>
                                    <Stat>
                                        <StatLabel>❗ Missing</StatLabel>
                                        <StatNumber color="red.500">{comparisonResults.summary.missingRecords}</StatNumber>
                                        <StatHelpText>
                                            {comparisonResults.summary.totalRecords > 0 
                                                ? Math.round((comparisonResults.summary.missingRecords / comparisonResults.summary.totalRecords) * 100)
                                                : 0}%
                                        </StatHelpText>
                                    </Stat>
                                    <Stat>
                                        <StatLabel>❓ Out of Range</StatLabel>
                                        <StatNumber color="purple.500">{comparisonResults.summary.outOfRangeRecords}</StatNumber>
                                        <StatHelpText>
                                            {comparisonResults.summary.totalRecords > 0 
                                                ? Math.round((comparisonResults.summary.outOfRangeRecords / comparisonResults.summary.totalRecords) * 100)
                                                : 0}%
                                        </StatHelpText>
                                    </Stat>
                                </SimpleGrid>

                                <Divider />

                                {/* Filters */}
                                <HStack spacing={4}>
                                    <InputGroup maxW="300px">
                                        <InputLeftElement pointerEvents="none">
                                            <FaSearch color="gray.300" />
                                        </InputLeftElement>
                                        <Input
                                            placeholder="Search data elements..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </InputGroup>
                                    <Select
                                        maxW="200px"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="valid">✅ Valid</option>
                                        <option value="mismatch">⚠️ Mismatch</option>
                                        <option value="missing">❗ Missing</option>
                                        <option value="out_of_range">❓ Out of Range</option>
                                    </Select>
                                    <Button
                                        size="sm"
                                        leftIcon={<FaRedo />}
                                        onClick={() => {
                                            setSelectedDatasets([])
                                            setComparisonResults(null)
                                        }}
                                    >
                                        New Comparison
                                    </Button>
                                </HStack>

                                {/* Dataset Info */}
                                {comparisonResults.datasets.length > 0 && (
                                    <Box p={4} bg="gray.50" borderRadius="md">
                                        <Heading size="sm" mb={2}>Data Element Value Comparison Results:</Heading>
                                        <Text fontSize="xs" color="gray.600" mb={3}>
                                            Comparing data element values for <strong>{comparisonResults.comparisonResults[0]?.orgUnitName || destinationOrgUnit}</strong> 
                                            {' '}in period <strong>{period}</strong> across the selected datasets:
                                        </Text>
                                        <HStack spacing={4} wrap="wrap">
                                            {comparisonResults.datasets.map((dataset: Dataset, index: number) => (
                                                <Badge key={dataset.id} colorScheme="blue" variant="outline">
                                                    Dataset {index + 1}: {dataset.displayName}
                                                </Badge>
                                            ))}
                                        </HStack>
                                    </Box>
                                )}

                                {/* Results Table */}
                                <Box overflowX="auto" maxH="500px" overflowY="auto" border="1px solid #E2E8F0" borderRadius="md">
                                    <Table variant="simple" size="sm">
                                        <Thead position="sticky" top={0} bg="white" zIndex={1}>
                                            <Tr>
                                                <Th>Status</Th>
                                                <Th>Data Element</Th>
                                                <Th>Org Unit</Th>
                                                <Th>Period</Th>
                                                {comparisonResults.datasets.map((dataset: Dataset, index: number) => (
                                                    <Th key={dataset.id}>
                                                        <Text fontSize="xs">
                                                            Dataset {index + 1} Value
                                                        </Text>
                                                    </Th>
                                                ))}
                                                <Th>Suggested Value</Th>
                                                <Th>Issues</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {filteredResults.length > 0 ? (
                                                filteredResults.map((result: ComparisonResult, index: number) => (
                                                    <Tr key={`${result.logicalDataElement}-${result.orgUnit}-${result.period}-${index}`}>
                                                        <Td>
                                                            <HStack spacing={2}>
                                                                {getStatusIcon(result.status)}
                                                                <Badge colorScheme={getStatusColor(result.status)} size="sm">
                                                                    {getStatusLabel(result.status)}
                                                                </Badge>
                                                                {result.suggestedCorrectValue && result.status === 'mismatch' && (
                                                                    <Badge colorScheme="blue" variant="outline" size="sm">
                                                                        💡 {result.suggestedCorrectValue}
                                                                    </Badge>
                                                                )}
                                                            </HStack>
                                                        </Td>
                                                        <Td>
                                                            <VStack align="start" spacing={1}>
                                                                <Text fontSize="sm" fontWeight="medium">
                                                                    {result.logicalDataElement}
                                                                </Text>
                                                                <VStack align="start" spacing={0}>
                                                                    {result.dataElementGroup.dataset1 && (
                                                                        <Text fontSize="xs" color="gray.500">
                                                                            DS1: {result.dataElementGroup.dataset1.name}
                                                                        </Text>
                                                                    )}
                                                                    {result.dataElementGroup.dataset2 && (
                                                                        <Text fontSize="xs" color="gray.500">
                                                                            DS2: {result.dataElementGroup.dataset2.name}
                                                                        </Text>
                                                                    )}
                                                                    {result.dataElementGroup.dataset3 && (
                                                                        <Text fontSize="xs" color="gray.500">
                                                                            DS3: {result.dataElementGroup.dataset3.name}
                                                                        </Text>
                                                                    )}
                                                                </VStack>
                                                            </VStack>
                                                        </Td>
                                                        <Td>
                                                            <Text fontSize="sm">{result.orgUnitName}</Text>
                                                        </Td>
                                                        <Td>
                                                            <Text fontSize="sm">{result.period}</Text>
                                                        </Td>
                                                        <Td>
                                                            <Text
                                                                fontSize="sm"
                                                                color={result.values.dataset1Value ? "inherit" : "gray.400"}
                                                                fontWeight={result.values.dataset1Value === result.suggestedCorrectValue ? "bold" : "normal"}
                                                            >
                                                                {result.values.dataset1Value || '—'}
                                                            </Text>
                                                        </Td>
                                                        <Td>
                                                            <Text
                                                                fontSize="sm"
                                                                color={result.values.dataset2Value ? "inherit" : "gray.400"}
                                                                fontWeight={result.values.dataset2Value === result.suggestedCorrectValue ? "bold" : "normal"}
                                                            >
                                                                {result.values.dataset2Value || '—'}
                                                            </Text>
                                                        </Td>
                                                        <Td>
                                                            <Text
                                                                fontSize="sm"
                                                                color={result.values.dataset3Value ? "inherit" : "gray.400"}
                                                                fontWeight={result.values.dataset3Value === result.suggestedCorrectValue ? "bold" : "normal"}
                                                            >
                                                                {result.values.dataset3Value || '—'}
                                                            </Text>
                                                        </Td>
                                                        <Td>
                                                            {result.suggestedCorrectValue ? (
                                                                <Badge colorScheme="blue" variant="solid" size="sm">
                                                                    💡 {result.suggestedCorrectValue}
                                                                </Badge>
                                                            ) : (
                                                                <Text fontSize="sm" color="gray.400">—</Text>
                                                            )}
                                                        </Td>
                                                        <Td>
                                                            {result.conflicts.length > 0 ? (
                                                                <VStack align="start" spacing={1}>
                                                                    {result.conflicts.map((conflict, idx) => (
                                                                        <Badge 
                                                                            key={idx} 
                                                                            colorScheme={conflict.includes('💡') ? 'blue' : 'red'} 
                                                                            variant="subtle" 
                                                                            size="sm"
                                                                        >
                                                                            {conflict}
                                                                        </Badge>
                                                                    ))}
                                                                </VStack>
                                                            ) : (
                                                                <Text fontSize="sm" color="gray.400">—</Text>
                                                            )}
                                                        </Td>
                                                    </Tr>
                                                ))
                                            ) : (
                                                <Tr>
                                                    <Td colSpan={9} textAlign="center" py={8}>
                                                        <Text color="gray.500">
                                                            {searchTerm || statusFilter !== 'all' 
                                                                ? 'No results match your filters' 
                                                                : 'No comparison data available'}
                                                        </Text>
                                                    </Td>
                                                </Tr>
                                            )}
                                        </Tbody>
                                    </Table>
                                </Box>

                                {filteredResults.length > 0 && (
                                    <Text fontSize="sm" color="gray.600" textAlign="center">
                                        Showing {filteredResults.length} of {comparisonResults.comparisonResults.length} records
                                    </Text>
                                )}
                            </VStack>
                        )}
                    </VStack>
                </ModalBody>
            </ModalContent>
            
            {/* Save Configuration Modal */}
            <Modal isOpen={showSaveConfig} onClose={() => setShowSaveConfig(false)} size="md">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Save Comparison Configuration</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack spacing={4} align="stretch">
                            <Box>
                                <Text fontSize="sm" mb={2} fontWeight="medium">Configuration Name *</Text>
                                <Input
                                    value={configName}
                                    onChange={(e) => setConfigName(e.target.value)}
                                    placeholder="e.g., Monthly Routine Comparison"
                                />
                            </Box>
                            
                            <Box>
                                <Text fontSize="sm" mb={2} fontWeight="medium">Description (Optional)</Text>
                                <Input
                                    value={configDescription}
                                    onChange={(e) => setConfigDescription(e.target.value)}
                                    placeholder="Brief description of this configuration..."
                                />
                            </Box>
                            
                            <Alert status="info" borderRadius="md">
                                <AlertIcon />
                                <VStack align="start" spacing={1}>
                                    <Text fontSize="sm" fontWeight="medium">Configuration Summary:</Text>
                                    <Text fontSize="xs">
                                        • {selectedDatasets.length} datasets selected
                                    </Text>
                                    <Text fontSize="xs">
                                        • {dataElementGroups.length} data element groups mapped
                                    </Text>
                                    <Text fontSize="xs">
                                        • Destination: {destinationUrl}
                                    </Text>
                                </VStack>
                            </Alert>
                        </VStack>
                    </ModalBody>
                    <Box px={6} pb={6}>
                        <HStack justifyContent="space-between">
                            <Button onClick={() => setShowSaveConfig(false)}>Cancel</Button>
                            <Button
                                colorScheme="green"
                                leftIcon={<FaSave />}
                                onClick={() => {
                                    if (!configName.trim()) {
                                        toast({
                                            title: 'Name Required',
                                            description: 'Please enter a name for this configuration',
                                            status: 'warning',
                                            duration: 3000
                                        })
                                        return
                                    }
                                    saveConfigMutation.mutate({
                                        name: configName.trim(),
                                        description: configDescription.trim() || undefined
                                    })
                                }}
                                isLoading={saveConfigMutation.isPending}
                                isDisabled={!configName.trim()}
                            >
                                Save Configuration
                            </Button>
                        </HStack>
                    </Box>
                </ModalContent>
            </Modal>
            
            {/* Step 2 Save Configuration Modal - Automatically triggered */}
            <Modal isOpen={showStep2SaveModal} onClose={() => setShowStep2SaveModal(false)} size="md">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Save Your Configuration</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack spacing={4} align="stretch">
                            <Alert status="success" borderRadius="md">
                                <AlertIcon />
                                <VStack align="start" spacing={1}>
                                    <Text fontSize="sm" fontWeight="medium">Ready to Save!</Text>
                                    <Text fontSize="xs">
                                        You've successfully mapped data elements. Save this configuration to reuse it later.
                                    </Text>
                                </VStack>
                            </Alert>
                            
                            <Box>
                                <Text fontSize="sm" mb={2} fontWeight="medium">Configuration Name *</Text>
                                <Input
                                    value={configName}
                                    onChange={(e) => setConfigName(e.target.value)}
                                    placeholder="e.g., Monthly Routine Comparison"
                                />
                            </Box>
                            
                            <Box>
                                <Text fontSize="sm" mb={2} fontWeight="medium">Description (Optional)</Text>
                                <Input
                                    value={configDescription}
                                    onChange={(e) => setConfigDescription(e.target.value)}
                                    placeholder="Brief description of this configuration..."
                                />
                            </Box>
                            
                            <Alert status="info" borderRadius="md">
                                <AlertIcon />
                                <VStack align="start" spacing={1}>
                                    <Text fontSize="sm" fontWeight="medium">This configuration includes:</Text>
                                    <Text fontSize="xs">• Source: {sourceUrl}</Text>
                                    <Text fontSize="xs">• {selectedSourceOrgUnits.length} org units</Text>
                                    <Text fontSize="xs">• {selectedDataElements.length} data elements</Text>
                                    <Text fontSize="xs">• Period: {period}</Text>
                                    <Text fontSize="xs">• {selectedDatasets.length} datasets mapped</Text>
                                    <Text fontSize="xs">• {dataElementGroups.length} element groups</Text>
                                </VStack>
                            </Alert>
                        </VStack>
                    </ModalBody>
                    <Box px={6} pb={6}>
                        <HStack justifyContent="space-between">
                            <Button onClick={() => setShowStep2SaveModal(false)} variant="outline">
                                Skip for Now
                            </Button>
                            <Button
                                colorScheme="green"
                                leftIcon={<FaSave />}
                                onClick={() => {
                                    if (!configName.trim()) {
                                        toast({
                                            title: 'Name Required',
                                            description: 'Please enter a name for this configuration',
                                            status: 'warning',
                                            duration: 3000
                                        })
                                        return
                                    }
                                    saveConfigMutation.mutate({
                                        name: configName.trim(),
                                        description: configDescription.trim() || undefined
                                    })
                                    setShowStep2SaveModal(false)
                                }}
                                isLoading={saveConfigMutation.isPending}
                                isDisabled={!configName.trim()}
                            >
                                Save Configuration
                            </Button>
                        </HStack>
                    </Box>
                </ModalContent>
            </Modal>
            
            {/* Load Configuration Modal */}
            <Modal isOpen={showLoadConfig} onClose={() => setShowLoadConfig(false)} size="lg">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Load Saved Configuration</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        <VStack spacing={4} align="stretch">
                            {loadingConfigs ? (
                                <Flex justify="center" py={8}>
                                    <VStack spacing={3}>
                                        <Spinner color="purple.500" />
                                        <Text>Loading saved configurations...</Text>
                                    </VStack>
                                </Flex>
                            ) : savedConfigurations.length === 0 ? (
                                <Alert status="info">
                                    <AlertIcon />
                                    <VStack align="start" spacing={1}>
                                        <Text fontWeight="medium">No Saved Configurations</Text>
                                        <Text fontSize="sm">
                                            You haven't saved any comparison configurations yet. 
                                            Create and save a configuration to quickly run comparisons later.
                                        </Text>
                                    </VStack>
                                </Alert>
                            ) : (
                                <VStack spacing={3} align="stretch">
                                    <Text fontSize="sm" color="gray.600">
                                        Select a saved configuration to quickly run a comparison:
                                    </Text>
                                    
                                    {savedConfigurations.map((config) => (
                                        <Card 
                                            key={config.id} 
                                            border="1px" 
                                            borderColor={selectedConfigId === config.id ? "purple.200" : "gray.200"}
                                            bg={selectedConfigId === config.id ? "purple.50" : "white"}
                                            cursor="pointer"
                                            onClick={() => setSelectedConfigId(config.id)}
                                            _hover={{ borderColor: "purple.300" }}
                                        >
                                            <CardBody py={3}>
                                                <HStack justify="space-between">
                                                    <VStack align="start" spacing={1}>
                                                        <HStack spacing={2}>
                                                            <Text fontWeight="medium">{config.name}</Text>
                                                            <Badge 
                                                                colorScheme={config.isActive ? "green" : "gray"}
                                                                size="sm"
                                                            >
                                                                {config.isActive ? "Active" : "Inactive"}
                                                            </Badge>
                                                        </HStack>
                                                        
                                                        {config.description && (
                                                            <Text fontSize="sm" color="gray.600">
                                                                {config.description}
                                                            </Text>
                                                        )}
                                                        
                                                        <HStack spacing={4}>
                                                            <Text fontSize="xs" color="gray.500">
                                                                📊 {config.datasetCount} datasets
                                                            </Text>
                                                            <Text fontSize="xs" color="gray.500">
                                                                🔗 {config.groupCount} groups
                                                            </Text>
                                                            <Text fontSize="xs" color="gray.500">
                                                                📅 {new Date(config.createdAt).toLocaleDateString()}
                                                            </Text>
                                                            {config.lastRunAt && (
                                                                <Text fontSize="xs" color="green.500">
                                                                    ✅ Last run: {new Date(config.lastRunAt).toLocaleDateString()}
                                                                </Text>
                                                            )}
                                                        </HStack>
                                                    </VStack>
                                                    
                                                    {selectedConfigId === config.id && (
                                                        <Icon as={FaCheck} color="purple.500" />
                                                    )}
                                                </HStack>
                                            </CardBody>
                                        </Card>
                                    ))}
                                </VStack>
                            )}
                        </VStack>
                    </ModalBody>
                    <Box px={6} pb={6}>
                        <HStack justifyContent="space-between">
                            <Button onClick={() => setShowLoadConfig(false)}>Cancel</Button>
                            <Button
                                colorScheme="purple"
                                leftIcon={<FaPlay />}
                                onClick={() => {
                                    if (!selectedConfigId) {
                                        toast({
                                            title: 'Selection Required',
                                            description: 'Please select a configuration to run',
                                            status: 'warning',
                                            duration: 3000
                                        })
                                        return
                                    }
                                    runSavedConfigMutation.mutate(selectedConfigId)
                                }}
                                isLoading={runSavedConfigMutation.isPending}
                                isDisabled={!selectedConfigId || savedConfigurations.find(c => c.id === selectedConfigId)?.isActive === false}
                            >
                                Quick Run Comparison
                            </Button>
                        </HStack>
                    </Box>
                </ModalContent>
            </Modal>
        </Modal>
    )
}