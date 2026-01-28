import React, { useState, useEffect, useRef } from 'react'
import {
    Box, Heading, Tabs, TabList, TabPanels, Tab, TabPanel,
    SimpleGrid, FormControl, FormLabel, Input, Button,
    Table, Thead, Tbody, Tr, Th, Td, useToast, Text, VStack, HStack,
    Checkbox, CheckboxGroup, Stack, InputGroup, InputLeftElement,
} from '@chakra-ui/react'
import { Tree } from 'antd'
import { useDataEngine } from '@dhis2/app-runtime'
import { FaSearch } from 'react-icons/fa'
import type { ChangeEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FaPlay, FaRegClock, FaBell } from 'react-icons/fa'
import {
    fetchSchedules,
    createSchedule,
    runDQ,
    fetchDatasets,
    fetchDatasetElements,
    validateAuth,
    type Schedule,
    type DHIS2Dataset,
    type DHIS2DataElement,
} from '../api'
import DataComparisonModal from './DataComparisonModal'
import NotificationManagement from './NotificationManagement'
import ConfigurationHomepage from './ConfigurationHomepage'
import DQPeriodPicker from './DQPeriodPicker'
import DQOrgUnitPicker from './DQOrgUnitPicker'
import AutoMappingButton from './AutoMappingButton'

export default function DQEngineView() {
    const toast = useToast()
    const qc = useQueryClient()
    const engine = useDataEngine()

    // form state - source
    const [sourceUrl, setSourceUrl] = useState('')
    const [sourceUser, setSourceUser] = useState('')
    const [sourcePass, setSourcePass] = useState('')
    const [dataElements, setDataElements] = useState('')
    const [datasetDC, setDatasetDC] = useState('')
    const [orgUnit, setOrgUnit] = useState('')
    const [period, setPeriod] = useState<string | string[]>('')

    // form state - destination
    const [destinationUrl, setDestinationUrl] = useState('')
    const [destinationUser, setDestinationUser] = useState('')
    const [destinationPass, setDestinationPass] = useState('')
    const [destinationDataset, setDestinationDataset] = useState('')
    const [destinationOrgUnit, setDestinationOrgUnit] = useState('')
    const [dataElementMapping, setDataElementMapping] = useState('')

    // dropdown state - source
    const [selectedSourceDataset, setSelectedSourceDataset] = useState('')
    const [selectedSourceOrgUnits, setSelectedSourceOrgUnits] = useState<string[]>([])
    const [selectedDataElements, setSelectedDataElements] = useState<string[]>([])

    // dropdown state - destination  
    const [selectedDestDataset, setSelectedDestDataset] = useState('')
    const [selectedDestOrgUnits, setSelectedDestOrgUnits] = useState<string[]>([])

    // org unit display names for multi-select
    const [selectedSourceOrgNames, setSelectedSourceOrgNames] = useState<string[]>([])
    const [selectedDestOrgNames, setSelectedDestOrgNames] = useState<string[]>([])

    // org unit tree state
    const [sourceOrgSearch, setSourceOrgSearch] = useState('')
    const [sourceOrgSearching, setSourceOrgSearching] = useState(false)
    const [sourceOrgTreeData, setSourceOrgTreeData] = useState<any[]>([])
    const [sourceOrgDropdownOpen, setSourceOrgDropdownOpen] = useState(false)
    const [sourceExpandedKeys, setSourceExpandedKeys] = useState<string[]>([])
    const [sourceOrgLevels, setSourceOrgLevels] = useState<{ id: string, level: number, displayName: string }[]>([])
    const [sourceSelectedLevel, setSourceSelectedLevel] = useState<number | null>(null)
    const [sourceParentOrgUnit, setSourceParentOrgUnit] = useState<string>('')

    const [destOrgSearch, setDestOrgSearch] = useState('')
    const [destOrgSearching, setDestOrgSearching] = useState(false)
    const [destOrgTreeData, setDestOrgTreeData] = useState<any[]>([])
    const [destOrgDropdownOpen, setDestOrgDropdownOpen] = useState(false)
    const [destExpandedKeys, setDestExpandedKeys] = useState<string[]>([])
    const [destOrgLevels, setDestOrgLevels] = useState<{ id: string, level: number, displayName: string }[]>([])
    const [destSelectedLevel, setDestSelectedLevel] = useState<number | null>(null)
    const [destParentOrgUnit, setDestParentOrgUnit] = useState<string>('')

    // dataset and data element search state
    const [datasetSearch, setDatasetSearch] = useState('')
    const [dataElementSearch, setDataElementSearch] = useState('')

    // comparison modal state
    const [comparisonModalOpen, setComparisonModalOpen] = useState(false)
    const [quickRunModalOpen, setQuickRunModalOpen] = useState(false)
    const [quickRunConfig, setQuickRunConfig] = useState<any>(null)
    const [lastSuccessfulRun, setLastSuccessfulRun] = useState<{
        destinationUrl: string
        destinationUser: string
        destinationPass: string
        destinationOrgUnit: string | string[]
        period: string
        targetDatasetId: string
        // Quick Run dataset configuration
        selectedDatasets?: string[]
        dataElementGroups?: any[]
        isQuickRun?: boolean
    } | null>(null)

    // Progress tracking state
    const [progressMessage, setProgressMessage] = useState('')
    const [isRunning, setIsRunning] = useState(false)

    // Ref to scroll to DQ forms
    const dqFormsRef = useRef<HTMLDivElement>(null)

    // Authentication states
    const [sourceAuthStatus, setSourceAuthStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle')
    const [destAuthStatus, setDestAuthStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle')
    const [sourceAuthError, setSourceAuthError] = useState('')
    const [destAuthError, setDestAuthError] = useState('')

    // Loading states
    const [loadingStates, setLoadingStates] = useState({
        sourceAuth: false,
        sourceDatasets: false,
        sourceOrgUnits: false,
        sourceElements: false,
        destAuth: false,
        destDatasets: false,
        destOrgUnits: false,
        destElements: false,
    })

    // manual‐run mutation
    const runMutation = useMutation<
        void, Error,
        {
            sourceUrl: string; sourceUser: string; sourcePass: string;
            dataElements: string[]; datasetDC: string;
            orgUnit: string | string[]; period: string;
            destinationUrl?: string; destinationUser?: string; destinationPass?: string;
            destinationDataset?: string; destinationOrgUnit?: string | string[];
            dataElementMapping?: Record<string, string>;
        }
    >({
        mutationFn: async (params) => {
            console.log('[DQEngineView] Starting mutation with params:', params)
            setIsRunning(true)
            setProgressMessage('Starting DQ Engine...')

            try {
                console.log('[DQEngineView] About to call runDQ with params:', JSON.stringify(params, null, 2))
                const result = await runDQ(params)
                console.log('[DQEngineView] Mutation successful:', result)
                setProgressMessage('DQ check completed successfully!')
                return result
            } catch (error: any) {
                console.error('[DQEngineView] Mutation failed with error:', error)
                console.error('[DQEngineView] Error message:', error.message)
                console.error('[DQEngineView] Error stack:', error.stack)
                setProgressMessage(`DQ check failed: ${error.message}`)

                // Parse error message for better display
                const isDataElementError = error.message?.includes('Data Element Mapping Error')
                const errorLines = error.message?.split('\n') || []
                
                // Show error toast with improved formatting
                toast({
                    status: 'error',
                    title: isDataElementError ? 'Data Element Mapping Required' : 'DQ Engine Failed',
                    description: isDataElementError && errorLines.length > 2 
                        ? `${errorLines[0]}\n\n${errorLines[2]}\n\n${errorLines[4] || 'Edit your configuration to add the required mappings.'}`
                        : error.message || 'An unknown error occurred',
                    duration: isDataElementError ? 12000 : 8000,
                    isClosable: true,
                    variant: isDataElementError ? 'left-accent' : 'solid'
                })

                throw error
            } finally {
                setTimeout(() => {
                    setIsRunning(false)
                    setProgressMessage('')
                }, 2000) // Clear message after 2 seconds
            }
        },
        onSuccess: (data: any, variables) => {
            console.log('[DQEngineView] onSuccess callback:', data)
            if (data.summary) {
                const destPosted = data.summary.destinationPosted || 0
                const description = destPosted > 0
                    ? `Processed ${data.summary.recordsProcessed} records, found ${data.summary.issuesFound} issues, posted ${destPosted} to destination`
                    : `Processed ${data.summary.recordsProcessed} records, found ${data.summary.issuesFound} issues`

                toast({
                    status: 'success',
                    title: 'DQ Engine completed!',
                    description,
                    duration: 5000
                })

                // DEBUG: Log the condition check values
                console.log('[DQEngineView] Checking if should open comparison modal:', {
                    destPosted,
                    'destPosted > 0': destPosted > 0,
                    'variables.destinationUrl': variables.destinationUrl,
                    'variables.destinationDataset': variables.destinationDataset,
                    'Destination configured': Boolean(variables.destinationUrl && variables.destinationDataset),
                    'Will open modal': Boolean(variables.destinationUrl && variables.destinationDataset)
                })

                // Open comparison modal if destination was configured (regardless of whether data was posted)
                // This allows users to set up data element mappings even if initial posting failed
                if (variables.destinationUrl && variables.destinationDataset) {
                    // Determine which org units actually had data posted
                    let actualDestinationOrgUnits: string | string[]
                    if (variables.destinationOrgUnit) {
                        actualDestinationOrgUnits = variables.destinationOrgUnit
                        console.log('[DQEngineView] Using specified destination org units:', actualDestinationOrgUnits)
                    } else {
                        // If no destination org units specified, data was posted to source org units
                        actualDestinationOrgUnits = variables.orgUnit
                        console.log('[DQEngineView] No destination org units specified, using source org units:', actualDestinationOrgUnits)
                    }

                    setLastSuccessfulRun({
                        destinationUrl: variables.destinationUrl,
                        destinationUser: variables.destinationUser,
                        destinationPass: variables.destinationPass,
                        destinationOrgUnit: actualDestinationOrgUnits,
                        period: variables.period,
                        targetDatasetId: variables.destinationDataset,
                        // Include Quick Run dataset configuration if this was a Quick Run
                        selectedDatasets: (variables as any).__quickRunConfig?.selectedDatasets || [],
                        dataElementGroups: (variables as any).__quickRunConfig?.dataElementGroups || [],
                        isQuickRun: Boolean((variables as any).__quickRunConfig?.isQuickRun)
                    })

                    // Small delay to let the toast show first
                    setTimeout(() => {
                        setComparisonModalOpen(true)
                    }, 1500)
                }
            } else {
                toast({ status: 'success', title: 'DQ Engine completed!' })
            }
        },
        onError: (error) => {
            console.error('[DQEngineView] onError callback:', error)
            
            // Parse error message for better display
            const isDataElementError = error.message?.includes('Data Element Mapping Error')
            const errorLines = error.message?.split('\n') || []
            
            toast({
                status: 'error',
                title: isDataElementError ? 'Data Element Mapping Required' : 'DQ Engine failed',
                description: isDataElementError && errorLines.length > 2 
                    ? `${errorLines[0]}\n\n${errorLines[2]}\n\nPlease edit your configuration to add the required mappings.`
                    : error.message,
                duration: isDataElementError ? 12000 : 5000,
                isClosable: true,
                variant: isDataElementError ? 'left-accent' : 'solid'
            })
        },
    })

    // schedules list
    const { data: schedules = [], isLoading: schedLoading } = useQuery<Schedule[]>({
        queryKey: ['schedules'],
        queryFn: fetchSchedules,
    })

    // create schedule
    const createSched = useMutation<Schedule, Error, { cron: string; name: string }>({
        mutationFn: payload => createSchedule(payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['schedules'] })
            toast({ status: 'success', title: 'Schedule added' })
        },
        onError: () =>
            toast({ status: 'error', title: 'Failed to add schedule' }),
    })

    // Authentication validation functions
    const validateSourceAuth = async () => {
        if (!sourceUrl || !sourceUser || !sourcePass) return

        setSourceAuthStatus('validating')
        setSourceAuthError('')

        try {
            // Use backend API to validate auth (avoids CORS issues)
            const result = await validateAuth(sourceUrl, sourceUser, sourcePass)

            if (result.success) {
                setSourceAuthStatus('success')
                toast({
                    status: 'success',
                    title: '✅ Source authentication successful',
                    description: result.user?.displayName ? `Logged in as ${result.user.displayName}` : undefined,
                    duration: 2000
                })
            } else {
                throw new Error('Authentication failed')
            }
        } catch (error: any) {
            setSourceAuthStatus('error')
            setSourceAuthError(error.message || 'Authentication failed')
            toast({
                status: 'error',
                title: '❌ Source authentication failed',
                description: 'Please check your credentials and try again',
                duration: 4000
            })
        }
    }

    const validateDestAuth = async () => {
        if (!destinationUrl || !destinationUser || !destinationPass) return

        setDestAuthStatus('validating')
        setDestAuthError('')

        try {
            // Use backend API to validate auth (avoids CORS issues)
            const result = await validateAuth(destinationUrl, destinationUser, destinationPass)

            if (result.success) {
                setDestAuthStatus('success')
                toast({
                    status: 'success',
                    title: '✅ Destination authentication successful',
                    description: result.user?.displayName ? `Logged in as ${result.user.displayName}` : undefined,
                    duration: 2000
                })
            } else {
                throw new Error('Authentication failed')
            }
        } catch (error: any) {
            setDestAuthStatus('error')
            setDestAuthError(error.message || 'Authentication failed')
            toast({
                status: 'error',
                title: '❌ Destination authentication failed',
                description: 'Please check your credentials and try again',
                duration: 4000
            })
        }
    }

    // Source DHIS2 queries
    const canFetchSourceMeta = Boolean(sourceUrl && sourceUser && sourcePass && sourceAuthStatus === 'success')
    const { data: sourceDatasets = [], isLoading: loadingSourceDatasets } = useQuery<DHIS2Dataset[]>({
        queryKey: ['source-datasets', sourceUrl, sourceUser],
        queryFn: async () => {
            setLoadingStates(prev => ({ ...prev, sourceAuth: true, sourceDatasets: true }))

            // Show loading notification
            const loadingToast = toast({
                status: 'info',
                title: '📊 Fetching metadata...',
                description: 'Loading datasets from source DHIS2',
                duration: null, // Keep showing until we dismiss it
                isClosable: false
            })

            try {
                const result = await fetchDatasets(sourceUrl, sourceUser, sourcePass)

                // Close loading toast and show success
                toast.close(loadingToast)
                toast({
                    status: 'success',
                    title: `✅ Metadata loaded successfully!`,
                    description: `Found ${result.length} datasets from source DHIS2`,
                    duration: 3000
                })

                return result
            } catch (error) {
                // Close loading toast on error
                toast.close(loadingToast)
                throw error
            } finally {
                setLoadingStates(prev => ({ ...prev, sourceAuth: false, sourceDatasets: false }))
            }
        },
        enabled: canFetchSourceMeta,
        staleTime: 5 * 60 * 1000,
    })

    // Note: Org units now loaded via DHIS2 app-runtime search

    const { data: sourceDataElements = [], isLoading: loadingSourceElements } = useQuery<DHIS2DataElement[]>({
        queryKey: ['source-elements', sourceUrl, sourceUser, selectedSourceDataset],
        queryFn: async () => {
            setLoadingStates(prev => ({ ...prev, sourceElements: true }))

            // Show loading notification for data elements
            const loadingToast = toast({
                status: 'info',
                title: '📋 Fetching data elements...',
                description: 'Loading data elements from selected dataset',
                duration: null,
                isClosable: false
            })

            try {
                const result = await fetchDatasetElements(sourceUrl, sourceUser, sourcePass, selectedSourceDataset)

                // Close loading toast and show success
                toast.close(loadingToast)
                toast({
                    status: 'success',
                    title: `✅ Data elements loaded!`,
                    description: `Found ${result.length} data elements in the dataset`,
                    duration: 3000
                })

                return result
            } catch (error) {
                // Close loading toast on error
                toast.close(loadingToast)
                throw error
            } finally {
                setLoadingStates(prev => ({ ...prev, sourceElements: false }))
            }
        },
        enabled: canFetchSourceMeta && Boolean(selectedSourceDataset),
        staleTime: 5 * 60 * 1000,
    })

    // Destination DHIS2 queries
    const canFetchDestMeta = Boolean(destinationUrl && destinationUser && destinationPass && destAuthStatus === 'success')
    const { data: destDatasets = [], isLoading: loadingDestDatasets } = useQuery<DHIS2Dataset[]>({
        queryKey: ['dest-datasets', destinationUrl, destinationUser],
        queryFn: async () => {
            setLoadingStates(prev => ({ ...prev, destAuth: true, destDatasets: true }))

            // Show loading notification for destination datasets
            const loadingToast = toast({
                status: 'info',
                title: '🎯 Fetching destination metadata...',
                description: 'Loading datasets from destination DHIS2',
                duration: null,
                isClosable: false
            })

            try {
                const result = await fetchDatasets(destinationUrl, destinationUser, destinationPass)

                // Close loading toast and show success
                toast.close(loadingToast)
                toast({
                    status: 'success',
                    title: `✅ Destination metadata loaded!`,
                    description: `Found ${result.length} datasets from destination DHIS2`,
                    duration: 3000
                })

                return result
            } catch (error) {
                // Close loading toast on error
                toast.close(loadingToast)
                throw error
            } finally {
                setLoadingStates(prev => ({ ...prev, destAuth: false, destDatasets: false }))
            }
        },
        enabled: canFetchDestMeta,
        staleTime: 5 * 60 * 1000,
    })

    // Note: Destination org units now loaded via DHIS2 app-runtime search

    const { data: destDataElements = [], isLoading: loadingDestElements } = useQuery<DHIS2DataElement[]>({
        queryKey: ['dest-elements', destinationUrl, destinationUser, selectedDestDataset],
        queryFn: async () => {
            setLoadingStates(prev => ({ ...prev, destElements: true }))

            // Show loading notification for destination data elements
            const loadingToast = toast({
                status: 'info',
                title: '🔗 Fetching mapping elements...',
                description: 'Loading data elements for destination mapping',
                duration: null,
                isClosable: false
            })

            try {
                const result = await fetchDatasetElements(destinationUrl, destinationUser, destinationPass, selectedDestDataset)

                // Close loading toast and show success
                toast.close(loadingToast)
                toast({
                    status: 'success',
                    title: `✅ Mapping elements loaded!`,
                    description: `Found ${result.length} data elements for mapping configuration`,
                    duration: 3000
                })

                return result
            } catch (error) {
                // Close loading toast on error
                toast.close(loadingToast)
                throw error
            } finally {
                setLoadingStates(prev => ({ ...prev, destElements: false }))
            }
        },
        enabled: canFetchDestMeta && Boolean(selectedDestDataset),
        staleTime: 5 * 60 * 1000,
    })

    // Load org unit tree data and levels when dropdown is opened
    useEffect(() => {
        if (sourceOrgDropdownOpen && sourceOrgTreeData.length === 0 && canFetchSourceMeta) {
            setSourceOrgSearching(true)

            // Show loading notification for org units
            const loadingToast = toast({
                status: 'info',
                title: '🌳 Loading org units...',
                description: 'Fetching organization unit structure and levels',
                duration: null,
                isClosable: false
            })

            // Fetch org unit levels first
            Promise.all([
                engine.query({
                    units: {
                        resource: 'organisationUnits.json',
                        params: {
                            fields: 'id,displayName,level,parent[id],children[id,displayName,level,parent[id]]',
                            paging: 'false'
                        }
                    }
                }),
                engine.query({
                    levels: {
                        resource: 'organisationUnitLevels.json',
                        params: {
                            fields: 'id,level,displayName',
                            paging: 'false'
                        }
                    }
                })
            ]).then(([unitsRes, levelsRes]: [any, any]) => {
                const units = unitsRes.units.organisationUnits || []
                const levels = levelsRes.levels.organisationUnitLevels || []

                const treeData = buildOrgUnitTree(units)
                setSourceOrgTreeData(treeData)
                setSourceOrgLevels(levels.sort((a: any, b: any) => a.level - b.level))
                setSourceOrgSearching(false)

                // Close loading toast and show success
                toast.close(loadingToast)
                toast({
                    status: 'success',
                    title: '✅ Org units loaded!',
                    description: `Found ${units.length} org units with ${levels.length} levels`,
                    duration: 3000
                })
            }).catch(() => {
                setSourceOrgSearching(false)
                toast.close(loadingToast)
                toast({
                    status: 'error',
                    title: '❌ Failed to load org units',
                    description: 'Could not fetch organization unit structure',
                    duration: 4000
                })
            })

        }
    }, [sourceOrgDropdownOpen, canFetchSourceMeta, engine, toast])

    useEffect(() => {
        if (destOrgDropdownOpen && destOrgTreeData.length === 0 && canFetchDestMeta) {
            setDestOrgSearching(true)

            // Show loading notification for destination org units
            const loadingToast = toast({
                status: 'info',
                title: '🎯 Loading destination org units...',
                description: 'Fetching destination organization unit structure',
                duration: null,
                isClosable: false
            })

            // Fetch org unit levels for destination
            Promise.all([
                engine.query({
                    units: {
                        resource: 'organisationUnits.json',
                        params: {
                            fields: 'id,displayName,level,parent[id],children[id,displayName,level,parent[id]]',
                            paging: 'false'
                        }
                    }
                }),
                engine.query({
                    levels: {
                        resource: 'organisationUnitLevels.json',
                        params: {
                            fields: 'id,level,displayName',
                            paging: 'false'
                        }
                    }
                })
            ]).then(([unitsRes, levelsRes]: [any, any]) => {
                const units = unitsRes.units.organisationUnits || []
                const levels = levelsRes.levels.organisationUnitLevels || []

                const treeData = buildOrgUnitTree(units)
                setDestOrgTreeData(treeData)
                setDestOrgLevels(levels.sort((a: any, b: any) => a.level - b.level))
                setDestOrgSearching(false)

                // Close loading toast and show success
                toast.close(loadingToast)
                toast({
                    status: 'success',
                    title: '✅ Destination org units loaded!',
                    description: `Found ${units.length} org units for destination mapping`,
                    duration: 3000
                })
            }).catch(() => {
                setDestOrgSearching(false)
                toast.close(loadingToast)
                toast({
                    status: 'error',
                    title: '❌ Failed to load destination org units',
                    description: 'Could not fetch destination organization structure',
                    duration: 4000
                })
            })
        }
    }, [destOrgDropdownOpen, canFetchDestMeta, engine, toast])

    // Reset authentication status when credentials change
    useEffect(() => {
        if (sourceAuthStatus !== 'idle') {
            setSourceAuthStatus('idle')
            setSourceAuthError('')
        }
    }, [sourceUrl, sourceUser, sourcePass])

    useEffect(() => {
        if (destAuthStatus !== 'idle') {
            setDestAuthStatus('idle')
            setDestAuthError('')
        }
    }, [destinationUrl, destinationUser, destinationPass])

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement
            if (!target.closest('.org-unit-dropdown')) {
                setSourceOrgDropdownOpen(false)
                setDestOrgDropdownOpen(false)
            }
        }

        if (sourceOrgDropdownOpen || destOrgDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [sourceOrgDropdownOpen, destOrgDropdownOpen])


    // Helper function to build org unit tree
    const buildOrgUnitTree = (units: any[]): any[] => {
        const unitMap = new Map()
        const rootUnits: any[] = []

        // First pass: create all nodes
        units.forEach(unit => {
            unitMap.set(unit.id, {
                key: unit.id,
                title: unit.displayName,
                id: unit.id,
                level: unit.level,
                children: []
            })
        })

        // Second pass: build hierarchy
        units.forEach(unit => {
            const node = unitMap.get(unit.id)
            if (unit.parent && unit.parent.id) {
                const parent = unitMap.get(unit.parent.id)
                if (parent) {
                    parent.children.push(node)
                }
            } else {
                rootUnits.push(node)
            }
        })

        return rootUnits
    }

    // Helper function to filter tree nodes based on search
    const filterTreeNodes = (nodes: any[], searchTerm: string): any[] => {
        if (!searchTerm) return nodes

        const filtered: any[] = []

        nodes.forEach(node => {
            const matchesSearch = node.title.toLowerCase().includes(searchTerm.toLowerCase())
            const filteredChildren = filterTreeNodes(node.children, searchTerm)

            if (matchesSearch || filteredChildren.length > 0) {
                filtered.push({
                    ...node,
                    children: filteredChildren
                })
            }
        })

        return filtered
    }

    // Helper function to get all org units at a specific level within a parent
    const getOrgUnitsAtLevel = (parentId: string, targetLevel: number, allUnits: any[]): string[] => {
        const result: string[] = []

        const findDescendantsAtLevel = (unitId: string, currentPath: string[]) => {
            const unit = allUnits.find(u => u.id === unitId)
            if (!unit) return

            if (unit.level === targetLevel) {
                result.push(unit.id)
                return
            }

            // Find children and continue searching
            const children = allUnits.filter(u => u.parent?.id === unitId)
            children.forEach(child => {
                if (!currentPath.includes(child.id)) { // Prevent infinite loops
                    findDescendantsAtLevel(child.id, [...currentPath, child.id])
                }
            })
        }

        findDescendantsAtLevel(parentId, [parentId])
        return result
    }

    // Helper function to auto-select org units based on parent and level
    const handleLevelSelection = (parentId: string, targetLevel: number, isSource: boolean) => {
        const treeData = isSource ? sourceOrgTreeData : destOrgTreeData
        const flatUnits = getFlatUnitsFromTree(treeData)
        const selectedUnits = getOrgUnitsAtLevel(parentId, targetLevel, flatUnits)

        if (isSource) {
            setSelectedSourceOrgUnits(selectedUnits)
            // Get names for display
            const names = selectedUnits.map(id => {
                const unit = flatUnits.find(u => u.id === id)
                return unit?.displayName || id
            })
            setSelectedSourceOrgNames(names)
            setOrgUnit(selectedUnits.join(','))

            // Auto-map to destination if destination is configured
            if (destinationUrl && destAuthStatus === 'success') {
                setSelectedDestOrgUnits(selectedUnits)
                setSelectedDestOrgNames(names)
                setDestinationOrgUnit(selectedUnits.join(','))

                toast({
                    status: 'info',
                    title: '🔗 Auto-mapped org units',
                    description: `Automatically mapped ${selectedUnits.length} facilities to destination`,
                    duration: 3000
                })
            }
        } else {
            setSelectedDestOrgUnits(selectedUnits)
            const names = selectedUnits.map(id => {
                const unit = flatUnits.find(u => u.id === id)
                return unit?.displayName || id
            })
            setSelectedDestOrgNames(names)
            setDestinationOrgUnit(selectedUnits.join(','))
        }
    }

    // Helper function to get flat list from tree
    const getFlatUnitsFromTree = (treeData: any[]): any[] => {
        const flat: any[] = []

        const traverse = (nodes: any[]) => {
            nodes.forEach(node => {
                flat.push({
                    id: node.id,
                    displayName: node.title,
                    level: node.level,
                    parent: node.parent
                })
                if (node.children && node.children.length > 0) {
                    traverse(node.children)
                }
            })
        }

        traverse(treeData)
        return flat
    }

    // Helper function to convert period to DHIS2 format (supports both single string and array)
    const formatPeriodForDHIS2 = (periodInput: string | string[]): string | string[] => {
        // Handle array of periods
        if (Array.isArray(periodInput)) {
            return periodInput.map(p => formatPeriodForDHIS2(p) as string)
        }

        // Handle single period string
        // If already in YYYYMM format, return as is
        if (/^\d{6}$/.test(periodInput)) {
            return periodInput
        }

        // Try to parse formats like "June 2025", "Jun 2025", "2025-06", etc.
        const monthNames = {
            'january': '01', 'jan': '01',
            'february': '02', 'feb': '02',
            'march': '03', 'mar': '03',
            'april': '04', 'apr': '04',
            'may': '05',
            'june': '06', 'jun': '06',
            'july': '07', 'jul': '07',
            'august': '08', 'aug': '08',
            'september': '09', 'sep': '09', 'sept': '09',
            'october': '10', 'oct': '10',
            'november': '11', 'nov': '11',
            'december': '12', 'dec': '12'
        }

        // Try "Month YYYY" format
        const monthYearMatch = periodInput.toLowerCase().match(/^(\w+)\s+(\d{4})$/)
        if (monthYearMatch) {
            const monthName = monthYearMatch[1]
            const year = monthYearMatch[2]
            const monthNum = monthNames[monthName as keyof typeof monthNames]
            if (monthNum) {
                return `${year}${monthNum}`
            }
        }

        // Try "YYYY-MM" format
        const dashMatch = periodInput.match(/^(\d{4})-(\d{1,2})$/)
        if (dashMatch) {
            const year = dashMatch[1]
            const month = dashMatch[2].padStart(2, '0')
            return `${year}${month}`
        }

        // Return original if no conversion possible
        return periodInput
    }

    // Filter datasets based on search
    const filteredSourceDatasets = sourceDatasets.filter(ds =>
        ds.displayName.toLowerCase().includes(datasetSearch.toLowerCase())
    )

    const filteredDestDatasets = destDatasets.filter(ds =>
        ds.displayName.toLowerCase().includes(datasetSearch.toLowerCase())
    )

    // Filter data elements based on search
    const filteredSourceDataElements = sourceDataElements.filter(de =>
        de.displayName.toLowerCase().includes(dataElementSearch.toLowerCase())
    )

    const filteredDestDataElements = destDataElements.filter(de =>
        de.displayName.toLowerCase().includes(dataElementSearch.toLowerCase())
    )

    const allFilled = Boolean(
        sourceUrl && sourceUser && sourcePass &&
        dataElements && datasetDC &&
        (selectedSourceOrgUnits.length > 0 || orgUnit) && // Check for selected org units or fallback to orgUnit
        period &&
        sourceAuthStatus === 'success'
    )

    return (
        <Box p={6} bg="gray.50" minH="100vh">
            <Heading mb={4}>DQ Engine Control Panel</Heading>

            <Tabs variant="enclosed" colorScheme="teal" isFitted>
                <TabList mb={4}>
                    <Tab><FaPlay /> Manual Configurations</Tab>
                    <Tab><FaRegClock /> Schedules</Tab>
                    <Tab><FaBell /> Notifications</Tab>
                </TabList>

                <TabPanels>

                    <TabPanel>
                        {/* Configuration Management Section */}
                        <Box mb={8}>
                            <ConfigurationHomepage
                                onCreateNew={() => {
                                    // Scroll to existing two side-by-side DQ forms
                                    dqFormsRef.current?.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'start'
                                    })
                                }}
                                onEditConfiguration={async (configId) => {
                                    console.log(`Edit Configuration: Loading configuration: ${configId}`)

                                    try {
                                        // Load the full configuration WITH passwords for editing
                                        const { getConfiguration } = await import('../api')
                                        const fullConfig = await getConfiguration(configId, true)

                                        console.log('Edit Configuration: Pre-populating form with saved parameters:', fullConfig)

                                        // Pre-populate the entire DQ form with saved parameters
                                        setSourceUrl(fullConfig.sourceUrl || '')
                                        setSourceUser(fullConfig.sourceUser || '')
                                        setSourcePass(fullConfig.sourcePass || '')
                                        setSelectedSourceDataset(fullConfig.selectedSourceDataset || '')
                                        setSelectedSourceOrgUnits(fullConfig.selectedSourceOrgUnits || [])
                                        setSelectedSourceOrgNames(fullConfig.selectedSourceOrgNames || [])
                                        setSelectedDataElements(fullConfig.selectedDataElements || [])
                                        setPeriod(fullConfig.period || '')

                                        // Also set the form fields that are used for validation
                                        setDatasetDC(fullConfig.selectedSourceDataset || '')
                                        setDataElements((fullConfig.selectedDataElements || []).join(','))
                                        setOrgUnit((fullConfig.selectedSourceOrgUnits || []).join(','))

                                        setDestinationUrl(fullConfig.destinationUrl || '')
                                        setDestinationUser(fullConfig.destinationUser || '')
                                        setDestinationPass(fullConfig.destinationPass || '')
                                        setSelectedDestDataset(fullConfig.selectedDestDataset || '')
                                        setSelectedDestOrgUnits(fullConfig.selectedDestOrgUnits || [])
                                        setSelectedDestOrgNames(fullConfig.selectedDestOrgNames || [])
                                        setDataElementMapping(fullConfig.dataElementMapping || '')

                                        // Also set destination form fields
                                        setDestinationDataset(fullConfig.selectedDestDataset || '')
                                        setDestinationOrgUnit((fullConfig.selectedDestOrgUnits || []).join(','))

                                        // Set authentication status to success since we have saved working credentials
                                        setSourceAuthStatus('success')
                                        if (fullConfig.destinationUrl && fullConfig.destinationUser && fullConfig.destinationPass) {
                                            setDestAuthStatus('success')
                                        }

                                        // Scroll to the manual configuration form
                                        dqFormsRef.current?.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'start'
                                        })

                                        toast({
                                            title: 'Configuration Loaded',
                                            description: `"${fullConfig.name}" is ready for editing. Make your changes and save.`,
                                            status: 'info',
                                            duration: 4000
                                        })

                                    } catch (error: any) {
                                        console.error('Edit Configuration error:', error)
                                        toast({
                                            title: 'Load Failed',
                                            description: error.message,
                                            status: 'error',
                                            duration: 4000
                                        })
                                    }
                                }}
                                onRunConfiguration={async (configId, configName) => {
                                    console.log(`Quick Run: Loading and executing configuration: ${configName} (${configId})`)

                                    try {
                                        // Load the full configuration WITH passwords for Quick Run
                                        const { getConfiguration } = await import('../api')
                                        const fullConfig = await getConfiguration(configId, true)

                                        console.log('Quick Run: Pre-populating DQ form with saved parameters:', fullConfig)
                                        console.log('Quick Run: Destination credentials from config:', {
                                            destinationUrl: fullConfig.destinationUrl,
                                            destinationUser: fullConfig.destinationUser,
                                            destinationPass: fullConfig.destinationPass ? `[${fullConfig.destinationPass.length} chars]` : 'MISSING',
                                            destinationPassStart: fullConfig.destinationPass ? fullConfig.destinationPass.substring(0, 3) : 'N/A',
                                            destinationPassEnd: fullConfig.destinationPass ? fullConfig.destinationPass.substring(fullConfig.destinationPass.length - 3) : 'N/A',
                                            isActuallyMasked: fullConfig.destinationPass === '***'
                                        })

                                        // Pre-populate the DQ form with saved parameters
                                        setSourceUrl(fullConfig.sourceUrl || '')
                                        setSourceUser(fullConfig.sourceUser || '')
                                        setSourcePass(fullConfig.sourcePass || '')
                                        setSelectedSourceDataset(fullConfig.selectedSourceDataset || '')
                                        setSelectedSourceOrgUnits(fullConfig.selectedSourceOrgUnits || [])
                                        setSelectedSourceOrgNames(fullConfig.selectedSourceOrgNames || [])
                                        setSelectedDataElements(fullConfig.selectedDataElements || [])
                                        setPeriod(fullConfig.period || '')

                                        // Also set the form fields that are used for validation
                                        setDatasetDC(fullConfig.selectedSourceDataset || '')
                                        setDataElements((fullConfig.selectedDataElements || []).join(','))
                                        setOrgUnit((fullConfig.selectedSourceOrgUnits || []).join(','))

                                        setDestinationUrl(fullConfig.destinationUrl || '')
                                        setDestinationUser(fullConfig.destinationUser || '')
                                        setDestinationPass(fullConfig.destinationPass || '')
                                        setSelectedDestDataset(fullConfig.selectedDestDataset || '')
                                        setSelectedDestOrgUnits(fullConfig.selectedDestOrgUnits || [])
                                        setSelectedDestOrgNames(fullConfig.selectedDestOrgNames || [])
                                        setDataElementMapping(fullConfig.dataElementMapping || '')
                                        
                                        // Also set destination form fields
                                        setDestinationDataset(fullConfig.selectedDestDataset || '')
                                        setDestinationOrgUnit((fullConfig.selectedDestOrgUnits || []).join(','))

                                        // Set authentication status to success since we have saved working credentials
                                        setSourceAuthStatus('success')
                                        if (fullConfig.destinationUrl && fullConfig.destinationUser && fullConfig.destinationPass) {
                                            setDestAuthStatus('success')
                                        }

                                        // Wait a moment for form to be populated
                                        await new Promise(resolve => setTimeout(resolve, 500))

                                        console.log('Quick Run: Form populated, executing DQ process...')
                                        console.log('Quick Run: Validation check - allFilled will be:', {
                                            sourceUrl: Boolean(fullConfig.sourceUrl),
                                            sourceUser: Boolean(fullConfig.sourceUser),
                                            sourcePass: Boolean(fullConfig.sourcePass),
                                            dataElements: Boolean((fullConfig.selectedDataElements || []).join(',')),
                                            datasetDC: Boolean(fullConfig.selectedSourceDataset),
                                            orgUnits: Boolean((fullConfig.selectedSourceOrgUnits || []).length > 0),
                                            period: Boolean(fullConfig.period),
                                            sourceAuthStatus: 'success'
                                        })

                                        // Parse data element mapping from string to Record<string, string>
                                        const mappingString = fullConfig.dataElementMapping || ''
                                        let parsedMapping: Record<string, string> | undefined = undefined
                                        if (mappingString.trim()) {
                                            try {
                                                const pairs = mappingString.split(',').map(s => s.trim()).filter(Boolean)
                                                parsedMapping = {}
                                                for (const pair of pairs) {
                                                    const [source, dest] = pair.split(':').map(s => s.trim())
                                                    if (source && dest) parsedMapping[source] = dest
                                                }
                                                console.log('Quick Run: Parsed data element mapping:', parsedMapping)
                                            } catch (e) {
                                                console.warn('Quick Run: Failed to parse data element mapping:', e)
                                            }
                                        }

                                        // Use the exact saved period without any formatting
                                        // The saved configuration already has the correct period from successful manual run
                                        const formattedPeriod = fullConfig.period || ''
                                        console.log('Quick Run: Using exact saved period:', formattedPeriod)

                                        // Build parameters exactly like manual flow
                                        const params: any = {
                                            sourceUrl: fullConfig.sourceUrl || '',
                                            sourceUser: fullConfig.sourceUser || '',
                                            sourcePass: fullConfig.sourcePass || '',
                                            dataElements: (fullConfig.selectedDataElements || []).length > 0 
                                                ? fullConfig.selectedDataElements 
                                                : [],
                                            datasetDC: fullConfig.selectedSourceDataset || '',
                                            orgUnit: (fullConfig.selectedSourceOrgUnits || []).length > 0 
                                                ? fullConfig.selectedSourceOrgUnits 
                                                : [fullConfig.selectedDestOrgUnits?.[0] || ''],
                                            period: formattedPeriod,
                                        }

                                        // Add destination parameters if provided (same as manual flow)
                                        if ((fullConfig.destinationUrl || '').trim()) {
                                            params.destinationUrl = fullConfig.destinationUrl
                                            params.destinationUser = fullConfig.destinationUser
                                            params.destinationPass = fullConfig.destinationPass
                                            
                                            console.log('Quick Run: Adding destination parameters:', {
                                                destinationUrl: params.destinationUrl,
                                                destinationUser: params.destinationUser,
                                                destinationPass: params.destinationPass ? `[${params.destinationPass.length} chars]` : 'MISSING',
                                                destPassStart: params.destinationPass ? params.destinationPass.substring(0, 3) : 'N/A',
                                                destPassEnd: params.destinationPass ? params.destinationPass.substring(params.destinationPass.length - 3) : 'N/A',
                                                isPassMasked: params.destinationPass === '***'
                                            })
                                            
                                            if ((fullConfig.selectedDestDataset || '').trim()) {
                                                params.destinationDataset = fullConfig.selectedDestDataset
                                            }
                                            if ((fullConfig.selectedDestOrgUnits || []).length > 0) {
                                                params.destinationOrgUnit = fullConfig.selectedDestOrgUnits
                                            }
                                            if (parsedMapping) {
                                                params.dataElementMapping = parsedMapping
                                            }
                                        } else {
                                            console.log('Quick Run: WARNING - No destination URL found in config, destination parameters not added')
                                        }

                                        console.log('Quick Run: Final API parameters being sent:', JSON.stringify(params, null, 2))
                                        console.log('Quick Run: CRITICAL - Period being sent to backend:', params.period)
                                        console.log('Quick Run: CRITICAL - If backend receives different period, there is conversion happening in runMutation')

                                        // Add Quick Run metadata to params for onSuccess handler detection
                                        const quickRunParams = {
                                            ...params,
                                            __quickRunConfig: {
                                                selectedDatasets: fullConfig.selectedDatasets || [],
                                                dataElementGroups: fullConfig.dataElementGroups || [],
                                                isQuickRun: true
                                            }
                                        }

                                        // Trigger the actual DQ execution (same as manual "Run DQ" button)
                                        runMutation.mutate(quickRunParams)

                                    } catch (error: any) {
                                        console.error('Quick Run configuration load error:', error)
                                        toast({
                                            title: 'Quick Run Failed',
                                            description: error.message,

                                            status: 'error',
                                            duration: 4000
                                        })
                                    }
                                }}
                            />
                        </Box>

                        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6} mb={6} ref={dqFormsRef}>
                            {/* Source DHIS2 Section */}
                            <Box p={4} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
                                <Heading size="md" mb={4} color="green.700">Source System Details (DHIS2)</Heading>

                                <SimpleGrid columns={1} gap={3}>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Source URL (DHIS2)</FormLabel>
                                        <Input
                                            size="sm"
                                            placeholder="Write Source URL here..."
                                            value={sourceUrl}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSourceUrl(e.target.value)}
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Username</FormLabel>
                                        <Input
                                            size="sm"
                                            placeholder="Username"
                                            value={sourceUser}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSourceUser(e.target.value)}
                                        />
                                        {loadingStates.sourceAuth && <Text fontSize="xs" color="blue.600">🔐 Authenticating...</Text>}
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Password</FormLabel>
                                        <HStack spacing={2}>
                                            <Input
                                                size="sm"
                                                type="password"
                                                placeholder="••••••"
                                                value={sourcePass}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setSourcePass(e.target.value)}
                                                onBlur={validateSourceAuth}
                                                isDisabled={sourceAuthStatus === 'validating'}
                                                flex={1}
                                            />
                                            <Button
                                                size="sm"
                                                colorScheme="blue"
                                                variant="outline"
                                                onClick={validateSourceAuth}
                                                isLoading={sourceAuthStatus === 'validating'}
                                                isDisabled={!sourceUrl || !sourceUser || !sourcePass || sourceAuthStatus === 'validating'}
                                                minW="80px"
                                            >
                                                Authenticate
                                            </Button>
                                        </HStack>
                                        {sourceAuthStatus === 'validating' && (
                                            <Text fontSize="xs" color="blue.600" mt={1}>🔐 Validating credentials...</Text>
                                        )}
                                        {sourceAuthStatus === 'success' && (
                                            <Text fontSize="xs" color="green.600" mt={1}>✅ Authentication successful</Text>
                                        )}
                                        {sourceAuthStatus === 'error' && (
                                            <Text fontSize="xs" color="red.600" mt={1}>❌ {sourceAuthError}</Text>
                                        )}
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Source Dataset</FormLabel>
                                        <VStack spacing={2} align="stretch">
                                            <InputGroup size="sm">
                                                <InputLeftElement pointerEvents="none">
                                                    <FaSearch color="gray.300" />
                                                </InputLeftElement>
                                                <Input
                                                    placeholder="Search datasets..."
                                                    value={datasetSearch}
                                                    onChange={(e) => setDatasetSearch(e.target.value)}
                                                    isDisabled={sourceAuthStatus !== 'success'}
                                                />
                                            </InputGroup>
                                            <Box>
                                                <select
                                                    style={{
                                                        width: '100%',
                                                        height: '32px',
                                                        fontSize: '14px',
                                                        padding: '4px 8px',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '6px',
                                                        backgroundColor: loadingSourceDatasets ? '#F7FAFC' : 'white'
                                                    }}
                                                    value={selectedSourceDataset}
                                                    onChange={(e) => {
                                                        setSelectedSourceDataset(e.target.value)
                                                        setDatasetDC(e.target.value)
                                                        setSelectedDataElements([]) // Reset selected elements
                                                    }}
                                                    disabled={loadingSourceDatasets || sourceAuthStatus !== 'success'}
                                                >
                                                    <option value="">Select dataset...</option>
                                                    {filteredSourceDatasets.map(ds => (
                                                        <option key={ds.id} value={ds.id}>
                                                            {ds.displayName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Box>
                                            {loadingSourceDatasets ? (
                                                <Text fontSize="xs" color="blue.600" fontWeight="medium">
                                                    📊 Fetching metadata from source DHIS2...
                                                </Text>
                                            ) : sourceAuthStatus !== 'success' ? (
                                                <Text fontSize="xs" color="orange.600">🔐 Complete authentication first</Text>
                                            ) : null}
                                        </VStack>
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Data Elements</FormLabel>
                                        {selectedSourceDataset && sourceDataElements.length > 0 ? (
                                            <VStack spacing={2} align="stretch">
                                                <InputGroup size="sm">
                                                    <InputLeftElement pointerEvents="none">
                                                        <FaSearch color="gray.300" />
                                                    </InputLeftElement>
                                                    <Input
                                                        placeholder="Search data elements..."
                                                        value={dataElementSearch}
                                                        onChange={(e) => setDataElementSearch(e.target.value)}
                                                        isDisabled={sourceAuthStatus !== 'success'}
                                                    />
                                                </InputGroup>
                                                <VStack spacing={2} align="stretch">
                                                    <HStack justifyContent="space-between" px={2} py={1} bg="gray.50" borderRadius="md">
                                                        <Text fontSize="xs" color="gray.600">
                                                            {selectedDataElements.length} of {filteredSourceDataElements.length} selected
                                                        </Text>
                                                        <HStack spacing={2}>
                                                            <Button
                                                                size="xs"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    const allIds = filteredSourceDataElements.map(de => de.id)
                                                                    setSelectedDataElements(allIds)
                                                                    setDataElements(allIds.join(','))
                                                                }}
                                                                isDisabled={filteredSourceDataElements.length === 0}
                                                            >
                                                                Select All
                                                            </Button>
                                                            <Button
                                                                size="xs"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setSelectedDataElements([])
                                                                    setDataElements('')
                                                                }}
                                                                isDisabled={selectedDataElements.length === 0}
                                                            >
                                                                Clear All
                                                            </Button>
                                                        </HStack>
                                                    </HStack>
                                                    <Box maxH="120px" overflowY="auto" p={2} border="1px" borderColor="gray.200" borderRadius="md">
                                                        <CheckboxGroup
                                                            value={selectedDataElements}
                                                            onChange={(values) => {
                                                                setSelectedDataElements(values as string[])
                                                                setDataElements(values.join(','))
                                                            }}
                                                        >
                                                            <Stack spacing={1}>
                                                                {filteredSourceDataElements.map(de => (
                                                                    <Checkbox key={de.id} value={de.id} size="sm">
                                                                        <Text fontSize="xs">{de.displayName}</Text>
                                                                    </Checkbox>
                                                                ))}
                                                            </Stack>
                                                        </CheckboxGroup>
                                                    </Box>
                                                </VStack>
                                            </VStack>
                                        ) : (
                                            <Text fontSize="xs" color="gray.500">
                                                {sourceAuthStatus !== 'success' ? '🔐 Complete authentication first' :
                                                    loadingSourceElements ? '📋 Fetching data elements from dataset...' :
                                                        selectedSourceDataset ? 'No elements found' : 'Select dataset first'}
                                            </Text>
                                        )}
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Source Org Unit(s)</FormLabel>
                                        <Box className="org-unit-dropdown" position="relative">
                                            <Input
                                                size="sm"
                                                placeholder={selectedSourceOrgUnits.length === 0 ? "Select org units..." : `${selectedSourceOrgUnits.length} org unit${selectedSourceOrgUnits.length !== 1 ? 's' : ''} selected`}
                                                value={selectedSourceOrgNames.length > 0 ? selectedSourceOrgNames.join(', ') : ''}
                                                readOnly
                                                cursor={sourceAuthStatus === 'success' ? "pointer" : "not-allowed"}
                                                onClick={() => sourceAuthStatus === 'success' && setSourceOrgDropdownOpen(!sourceOrgDropdownOpen)}
                                                bg={sourceAuthStatus === 'success' ? "white" : "gray.100"}
                                                isDisabled={sourceAuthStatus !== 'success'}
                                            />
                                            {sourceOrgDropdownOpen && (
                                                <Box
                                                    position="absolute"
                                                    top="100%"
                                                    left={0}
                                                    right={0}
                                                    zIndex={1000}
                                                    bg="white"
                                                    border="1px solid #E2E8F0"
                                                    borderRadius="md"
                                                    boxShadow="lg"
                                                    mt={1}
                                                    maxW="500px"
                                                >
                                                    <VStack spacing={2} align="stretch" p={3}>
                                                        {/* Level-based Selection */}
                                                        {sourceOrgLevels.length > 0 && (
                                                            <Box p={2} bg="gray.50" borderRadius="md" border="1px solid #E2E8F0">
                                                                <Text fontSize="xs" fontWeight="semibold" color="gray.700" mb={2}>
                                                                    📊 Select by Org Unit Level
                                                                </Text>
                                                                <VStack spacing={2} align="stretch">
                                                                    <HStack spacing={2}>
                                                                        <Box flex={1}>
                                                                            <Text fontSize="xs" color="gray.600" mb={1}>1. Select Parent:</Text>
                                                                            <select
                                                                                style={{
                                                                                    width: '100%',
                                                                                    height: '28px',
                                                                                    fontSize: '12px',
                                                                                    padding: '2px 4px',
                                                                                    border: '1px solid #E2E8F0',
                                                                                    borderRadius: '4px'
                                                                                }}
                                                                                value={sourceParentOrgUnit}
                                                                                onChange={(e) => setSourceParentOrgUnit(e.target.value)}
                                                                            >
                                                                                <option value="">Choose parent org unit...</option>
                                                                                {getFlatUnitsFromTree(sourceOrgTreeData).map(unit => (
                                                                                    <option key={unit.id} value={unit.id}>
                                                                                        {unit.displayName} (Level {unit.level})
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </Box>
                                                                        <Box flex={1}>
                                                                            <Text fontSize="xs" color="gray.600" mb={1}>2. Select Target Level:</Text>
                                                                            <select
                                                                                style={{
                                                                                    width: '100%',
                                                                                    height: '28px',
                                                                                    fontSize: '12px',
                                                                                    padding: '2px 4px',
                                                                                    border: '1px solid #E2E8F0',
                                                                                    borderRadius: '4px'
                                                                                }}
                                                                                value={sourceSelectedLevel || ''}
                                                                                onChange={(e) => setSourceSelectedLevel(e.target.value ? parseInt(e.target.value) : null)}
                                                                            >
                                                                                <option value="">Choose level...</option>
                                                                                {sourceOrgLevels.map(level => (
                                                                                    <option key={level.id} value={level.level}>
                                                                                        Level {level.level}: {level.displayName}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </Box>
                                                                    </HStack>
                                                                    {sourceParentOrgUnit && sourceSelectedLevel && (
                                                                        <Button
                                                                            size="xs"
                                                                            colorScheme="blue"
                                                                            onClick={() => handleLevelSelection(sourceParentOrgUnit, sourceSelectedLevel, true)}
                                                                        >
                                                                            🎯 Auto-select all Level {sourceSelectedLevel} units
                                                                        </Button>
                                                                    )}
                                                                </VStack>
                                                            </Box>
                                                        )}

                                                        {/* Manual Selection */}
                                                        <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                                                            🔍 Manual Selection
                                                        </Text>
                                                        <InputGroup size="sm">
                                                            <InputLeftElement pointerEvents="none">
                                                                <FaSearch color="gray.300" />
                                                            </InputLeftElement>
                                                            <Input
                                                                placeholder="Search org units..."
                                                                value={sourceOrgSearch}
                                                                onChange={(e) => setSourceOrgSearch(e.target.value)}
                                                            />
                                                        </InputGroup>

                                                        {sourceOrgSearching ? (
                                                            <Text fontSize="xs" color="blue.600" p={2} fontWeight="medium">
                                                                🌳 Loading organization unit structure...
                                                            </Text>
                                                        ) : sourceOrgTreeData.length > 0 ? (
                                                            <Box maxH="300px" overflowY="auto">
                                                                <Tree
                                                                    treeData={filterTreeNodes(sourceOrgTreeData, sourceOrgSearch)}
                                                                    expandedKeys={sourceExpandedKeys}
                                                                    onExpand={(keys) => setSourceExpandedKeys(keys as string[])}
                                                                    checkable={true}
                                                                    checkedKeys={selectedSourceOrgUnits}
                                                                    checkStrictly={true}
                                                                    onCheck={(checkedKeys) => {
                                                                        const keys = Array.isArray(checkedKeys) ? checkedKeys as string[] : checkedKeys.checked as string[]
                                                                        setSelectedSourceOrgUnits(keys)

                                                                        // Get names for display
                                                                        const names: string[] = []
                                                                        const findNodeNames = (nodes: any[], targetKeys: string[]) => {
                                                                            nodes.forEach(node => {
                                                                                if (targetKeys.includes(node.key)) {
                                                                                    names.push(node.title)
                                                                                }
                                                                                if (node.children && node.children.length > 0) {
                                                                                    findNodeNames(node.children, targetKeys)
                                                                                }
                                                                            })
                                                                        }
                                                                        findNodeNames(sourceOrgTreeData, keys)
                                                                        setSelectedSourceOrgNames(names)
                                                                        setOrgUnit(keys.join(',')) // Join multiple org units with comma

                                                                        // Auto-map to destination org units if destination URL is provided
                                                                        if (destinationUrl && destAuthStatus === 'success') {
                                                                            setSelectedDestOrgUnits(keys)
                                                                            setSelectedDestOrgNames(names)
                                                                            setDestinationOrgUnit(keys.join(','))

                                                                            toast({
                                                                                status: 'info',
                                                                                title: '🔗 Auto-mapped org units',
                                                                                description: `Automatically mapped ${keys.length} org units to destination`,
                                                                                duration: 3000
                                                                            })
                                                                        }
                                                                    }}
                                                                    showIcon={false}
                                                                    height={250}
                                                                />
                                                            </Box>
                                                        ) : (
                                                            <Text fontSize="xs" color="gray.500" p={2}>
                                                                {canFetchSourceMeta ? 'No org units available' : 'Enter source credentials first'}
                                                            </Text>
                                                        )}

                                                        {selectedSourceOrgUnits.length > 0 && (
                                                            <VStack spacing={2} pt={2} borderTop="1px solid #E2E8F0" align="stretch">
                                                                <HStack justifyContent="space-between">
                                                                    <Text fontSize="xs" color="blue.700">
                                                                        ✓ {selectedSourceOrgUnits.length} org unit{selectedSourceOrgUnits.length !== 1 ? 's' : ''} selected
                                                                    </Text>
                                                                    <Button
                                                                        size="xs"
                                                                        variant="link"
                                                                        colorScheme="red"
                                                                        onClick={() => {
                                                                            setSelectedSourceOrgUnits([])
                                                                            setSelectedSourceOrgNames([])
                                                                            setOrgUnit('')
                                                                        }}
                                                                    >
                                                                        Clear All
                                                                    </Button>
                                                                </HStack>
                                                                {selectedSourceOrgNames.length <= 3 ? (
                                                                    selectedSourceOrgNames.map((name, index) => (
                                                                        <Text key={index} fontSize="xs" color="gray.600" pl={2}>
                                                                            • {name}
                                                                        </Text>
                                                                    ))
                                                                ) : (
                                                                    <Text fontSize="xs" color="gray.600" pl={2}>
                                                                        • {selectedSourceOrgNames.slice(0, 2).join(', ')} and {selectedSourceOrgNames.length - 2} more...
                                                                    </Text>
                                                                )}
                                                            </VStack>
                                                        )}
                                                    </VStack>
                                                </Box>
                                            )}
                                        </Box>
                                    </FormControl>
                                    <DQPeriodPicker
                                        value={period}
                                        onChange={(periodValue, displayName) => {
                                            setPeriod(periodValue)
                                            toast({
                                                status: 'success',
                                                title: '📅 Period selected',
                                                description: displayName,
                                                duration: 2000
                                            })
                                        }}
                                        isDisabled={sourceAuthStatus !== 'success'}
                                        allowMultiple={true}
                                    />
                                </SimpleGrid>
                            </Box>

                            {/* Destination DHIS2 Section */}
                            <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                                <Heading size="md" mb={3} color="blue.700">Destination System Details (DHIS2)</Heading>
                                <SimpleGrid columns={1} gap={3}>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Destination URL (DHIS2)</FormLabel>
                                        <Input
                                            size="sm"
                                            placeholder="Write Destination URL here..."
                                            value={destinationUrl}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setDestinationUrl(e.target.value)}
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Destination Username</FormLabel>
                                        <Input
                                            size="sm"
                                            placeholder="Username"
                                            value={destinationUser}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => setDestinationUser(e.target.value)}
                                        />
                                        {loadingStates.destAuth && <Text fontSize="xs" color="blue.600">🔐 Authenticating...</Text>}
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Destination Password</FormLabel>
                                        <HStack spacing={2}>
                                            <Input
                                                size="sm"
                                                type="password"
                                                placeholder="••••••"
                                                value={destinationPass}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => setDestinationPass(e.target.value)}
                                                onBlur={validateDestAuth}
                                                isDisabled={destAuthStatus === 'validating'}
                                                flex={1}
                                            />
                                            <Button
                                                size="sm"
                                                colorScheme="blue"
                                                variant="outline"
                                                onClick={validateDestAuth}
                                                isLoading={destAuthStatus === 'validating'}
                                                isDisabled={!destinationUrl || !destinationUser || !destinationPass || destAuthStatus === 'validating'}
                                                minW="80px"
                                            >
                                                Authenticate
                                            </Button>
                                        </HStack>
                                        {destAuthStatus === 'validating' && (
                                            <Text fontSize="xs" color="blue.600" mt={1}>🔐 Validating credentials...</Text>
                                        )}
                                        {destAuthStatus === 'success' && (
                                            <Text fontSize="xs" color="green.600" mt={1}>✅ Authentication successful</Text>
                                        )}
                                        {destAuthStatus === 'error' && (
                                            <Text fontSize="xs" color="red.600" mt={1}>❌ {destAuthError}</Text>
                                        )}
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Destination Dataset</FormLabel>
                                        <VStack spacing={2} align="stretch">
                                            <InputGroup size="sm">
                                                <InputLeftElement pointerEvents="none">
                                                    <FaSearch color="gray.300" />
                                                </InputLeftElement>
                                                <Input
                                                    placeholder="Search datasets..."
                                                    value={datasetSearch}
                                                    onChange={(e) => setDatasetSearch(e.target.value)}
                                                    isDisabled={destAuthStatus !== 'success'}
                                                />
                                            </InputGroup>
                                            <Box>
                                                <select
                                                    style={{
                                                        width: '100%',
                                                        height: '32px',
                                                        fontSize: '14px',
                                                        padding: '4px 8px',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '6px',
                                                        backgroundColor: loadingDestDatasets ? '#F7FAFC' : 'white'
                                                    }}
                                                    value={selectedDestDataset}
                                                    onChange={(e) => {
                                                        setSelectedDestDataset(e.target.value)
                                                        setDestinationDataset(e.target.value)
                                                    }}
                                                    disabled={loadingDestDatasets || destAuthStatus !== 'success'}
                                                >
                                                    <option value="">Select dataset...</option>
                                                    {filteredDestDatasets.map(ds => (
                                                        <option key={ds.id} value={ds.id}>
                                                            {ds.displayName}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Box>
                                            {loadingDestDatasets ? (
                                                <Text fontSize="xs" color="blue.600" fontWeight="medium">
                                                    📊 Fetching metadata from destination DHIS2...
                                                </Text>
                                            ) : destAuthStatus !== 'success' && destinationUrl ? (
                                                <Text fontSize="xs" color="orange.600">🔐 Complete authentication first</Text>
                                            ) : null}
                                        </VStack>
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel fontSize="sm">Destination Org Unit(s)</FormLabel>
                                        <Box className="org-unit-dropdown" position="relative">
                                            <Input
                                                size="sm"
                                                placeholder={selectedDestOrgUnits.length === 0 ? "Select org units (optional)..." : `${selectedDestOrgUnits.length} org unit${selectedDestOrgUnits.length !== 1 ? 's' : ''} selected`}
                                                value={selectedDestOrgNames.length > 0 ? selectedDestOrgNames.join(', ') : ''}
                                                readOnly
                                                cursor={destAuthStatus === 'success' || !destinationUrl ? "pointer" : "not-allowed"}
                                                onClick={() => (destAuthStatus === 'success' || !destinationUrl) && setDestOrgDropdownOpen(!destOrgDropdownOpen)}
                                                bg={destAuthStatus === 'success' || !destinationUrl ? "white" : "gray.100"}
                                                isDisabled={destinationUrl && destAuthStatus !== 'success'}
                                            />
                                            {destOrgDropdownOpen && (
                                                <Box
                                                    position="absolute"
                                                    top="100%"
                                                    left={0}
                                                    right={0}
                                                    zIndex={1000}
                                                    bg="white"
                                                    border="1px solid #E2E8F0"
                                                    borderRadius="md"
                                                    boxShadow="lg"
                                                    mt={1}
                                                    maxW="500px"
                                                >
                                                    <VStack spacing={2} align="stretch" p={3}>
                                                        {/* Level-based Selection */}
                                                        {destOrgLevels.length > 0 && (
                                                            <Box p={2} bg="gray.50" borderRadius="md" border="1px solid #E2E8F0">
                                                                <Text fontSize="xs" fontWeight="semibold" color="gray.700" mb={2}>
                                                                    📊 Select by Org Unit Level
                                                                </Text>
                                                                <VStack spacing={2} align="stretch">
                                                                    <HStack spacing={2}>
                                                                        <Box flex={1}>
                                                                            <Text fontSize="xs" color="gray.600" mb={1}>1. Select Parent:</Text>
                                                                            <select
                                                                                style={{
                                                                                    width: '100%',
                                                                                    height: '28px',
                                                                                    fontSize: '12px',
                                                                                    padding: '2px 4px',
                                                                                    border: '1px solid #E2E8F0',
                                                                                    borderRadius: '4px'
                                                                                }}
                                                                                value={destParentOrgUnit}
                                                                                onChange={(e) => setDestParentOrgUnit(e.target.value)}
                                                                            >
                                                                                <option value="">Choose parent org unit...</option>
                                                                                {getFlatUnitsFromTree(destOrgTreeData).map(unit => (
                                                                                    <option key={unit.id} value={unit.id}>
                                                                                        {unit.displayName} (Level {unit.level})
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </Box>
                                                                        <Box flex={1}>
                                                                            <Text fontSize="xs" color="gray.600" mb={1}>2. Select Target Level:</Text>
                                                                            <select
                                                                                style={{
                                                                                    width: '100%',
                                                                                    height: '28px',
                                                                                    fontSize: '12px',
                                                                                    padding: '2px 4px',
                                                                                    border: '1px solid #E2E8F0',
                                                                                    borderRadius: '4px'
                                                                                }}
                                                                                value={destSelectedLevel || ''}
                                                                                onChange={(e) => setDestSelectedLevel(e.target.value ? parseInt(e.target.value) : null)}
                                                                            >
                                                                                <option value="">Choose level...</option>
                                                                                {destOrgLevels.map(level => (
                                                                                    <option key={level.id} value={level.level}>
                                                                                        Level {level.level}: {level.displayName}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </Box>
                                                                    </HStack>
                                                                    {destParentOrgUnit && destSelectedLevel && (
                                                                        <Button
                                                                            size="xs"
                                                                            colorScheme="blue"
                                                                            onClick={() => handleLevelSelection(destParentOrgUnit, destSelectedLevel, false)}
                                                                        >
                                                                            🎯 Auto-select all Level {destSelectedLevel} units
                                                                        </Button>
                                                                    )}
                                                                </VStack>
                                                            </Box>
                                                        )}

                                                        {/* Manual Selection */}
                                                        <Text fontSize="xs" fontWeight="semibold" color="gray.700">
                                                            🔍 Manual Selection
                                                        </Text>
                                                        <InputGroup size="sm">
                                                            <InputLeftElement pointerEvents="none">
                                                                <FaSearch color="gray.300" />
                                                            </InputLeftElement>
                                                            <Input
                                                                placeholder="Search org units..."
                                                                value={destOrgSearch}
                                                                onChange={(e) => setDestOrgSearch(e.target.value)}
                                                            />
                                                        </InputGroup>

                                                        {destOrgSearching ? (
                                                            <Text fontSize="xs" color="blue.600" p={2} fontWeight="medium">
                                                                🌳 Loading destination org unit structure...
                                                            </Text>
                                                        ) : destOrgTreeData.length > 0 ? (
                                                            <Box maxH="300px" overflowY="auto">
                                                                <Tree
                                                                    treeData={filterTreeNodes(destOrgTreeData, destOrgSearch)}
                                                                    expandedKeys={destExpandedKeys}
                                                                    onExpand={(keys) => setDestExpandedKeys(keys as string[])}
                                                                    checkable={true}
                                                                    checkedKeys={selectedDestOrgUnits}
                                                                    checkStrictly={true}
                                                                    onCheck={(checkedKeys) => {
                                                                        const keys = Array.isArray(checkedKeys) ? checkedKeys as string[] : checkedKeys.checked as string[]
                                                                        setSelectedDestOrgUnits(keys)

                                                                        // Get names for display
                                                                        const names: string[] = []
                                                                        const findNodeNames = (nodes: any[], targetKeys: string[]) => {
                                                                            nodes.forEach(node => {
                                                                                if (targetKeys.includes(node.key)) {
                                                                                    names.push(node.title)
                                                                                }
                                                                                if (node.children && node.children.length > 0) {
                                                                                    findNodeNames(node.children, targetKeys)
                                                                                }
                                                                            })
                                                                        }
                                                                        findNodeNames(destOrgTreeData, keys)
                                                                        setSelectedDestOrgNames(names)
                                                                        setDestinationOrgUnit(keys.join(',')) // Join multiple org units with comma
                                                                    }}
                                                                    showIcon={false}
                                                                    height={250}
                                                                />
                                                            </Box>
                                                        ) : (
                                                            <Text fontSize="xs" color="gray.500" p={2}>
                                                                {canFetchDestMeta ? 'No org units available' : 'Enter destination credentials first'}
                                                            </Text>
                                                        )}

                                                        {selectedDestOrgUnits.length > 0 && (
                                                            <VStack spacing={2} pt={2} borderTop="1px solid #E2E8F0" align="stretch">
                                                                <HStack justifyContent="space-between">
                                                                    <Text fontSize="xs" color="blue.700">
                                                                        ✓ {selectedDestOrgUnits.length} org unit{selectedDestOrgUnits.length !== 1 ? 's' : ''} selected
                                                                    </Text>
                                                                    <Button
                                                                        size="xs"
                                                                        variant="link"
                                                                        colorScheme="red"
                                                                        onClick={() => {
                                                                            setSelectedDestOrgUnits([])
                                                                            setSelectedDestOrgNames([])
                                                                            setDestinationOrgUnit('')
                                                                        }}
                                                                    >
                                                                        Clear All
                                                                    </Button>
                                                                </HStack>
                                                                {selectedDestOrgNames.length <= 3 ? (
                                                                    selectedDestOrgNames.map((name, index) => (
                                                                        <Text key={index} fontSize="xs" color="gray.600" pl={2}>
                                                                            • {name}
                                                                        </Text>
                                                                    ))
                                                                ) : (
                                                                    <Text fontSize="xs" color="gray.600" pl={2}>
                                                                        • {selectedDestOrgNames.slice(0, 2).join(', ')} and {selectedDestOrgNames.length - 2} more...
                                                                    </Text>
                                                                )}
                                                            </VStack>
                                                        )}
                                                    </VStack>
                                                </Box>
                                            )}
                                        </Box>
                                    </FormControl>
                                    <FormControl>
                                        <HStack mb={2} justify="space-between" align="center">
                                            <FormLabel fontSize="sm" mb={0}>Data Element Mapping</FormLabel>
                                            {selectedDataElements.length > 0 && destDataElements.length > 0 && (
                                                <AutoMappingButton
                                                    sourceElements={sourceDataElements.filter(de => selectedDataElements.includes(de.id))}
                                                    targetElements={destDataElements}
                                                    onMappingGenerated={(mapping) => {
                                                        // Convert mapping object to string format
                                                        const mappingStr = Object.entries(mapping)
                                                            .map(([src, dest]) => `${src}:${dest}`)
                                                            .join(',')
                                                        setDataElementMapping(mappingStr)
                                                        toast({
                                                            status: 'success',
                                                            title: '✨ Auto-mapping applied',
                                                            description: `${Object.keys(mapping).length} element(s) mapped automatically`,
                                                            duration: 3000
                                                        })
                                                    }}
                                                    isDisabled={destAuthStatus !== 'success'}
                                                />
                                            )}
                                        </HStack>
                                        {selectedDataElements.length > 0 && destDataElements.length > 0 ? (
                                            <VStack spacing={2} align="stretch">
                                                {selectedDataElements.map(sourceId => {
                                                    const sourceElement = sourceDataElements.find(de => de.id === sourceId)
                                                    // Get current mapping for this element
                                                    let currentMapping = ''
                                                    if (dataElementMapping) {
                                                        const mappingObj: Record<string, string> = {}
                                                        dataElementMapping.split(',').forEach(pair => {
                                                            const [src, dest] = pair.split(':')
                                                            if (src && dest) mappingObj[src.trim()] = dest.trim()
                                                        })
                                                        currentMapping = mappingObj[sourceId] || ''
                                                    }
                                                    return (
                                                        <HStack key={sourceId} spacing={2}>
                                                            <Text fontSize="xs" flex={1} isTruncated>
                                                                {sourceElement?.displayName}
                                                            </Text>
                                                            <Text fontSize="xs">→</Text>
                                                            <select
                                                                value={currentMapping}
                                                                style={{
                                                                    flex: 1,
                                                                    height: '24px',
                                                                    fontSize: '12px',
                                                                    padding: '2px 4px',
                                                                    border: '1px solid #E2E8F0',
                                                                    borderRadius: '4px',
                                                                    minWidth: '0',
                                                                    backgroundColor: currentMapping ? '#EBF8FF' : 'white'
                                                                }}
                                                                onChange={(e) => {
                                                                    // Update mapping
                                                                    const mappingObj: Record<string, string> = {}
                                                                    if (dataElementMapping) {
                                                                        dataElementMapping.split(',').forEach(pair => {
                                                                            const [src, dest] = pair.split(':')
                                                                            if (src && dest) mappingObj[src.trim()] = dest.trim()
                                                                        })
                                                                    }
                                                                    mappingObj[sourceId] = e.target.value
                                                                    const mappingStr = Object.entries(mappingObj)
                                                                        .filter(([_, dest]) => dest)
                                                                        .map(([src, dest]) => `${src}:${dest}`)
                                                                        .join(',')
                                                                    setDataElementMapping(mappingStr)
                                                                }}
                                                            >
                                                                <option value="">Map to...</option>
                                                                {filteredDestDataElements.map(de => (
                                                                    <option key={de.id} value={de.id}>
                                                                        {de.displayName}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </HStack>
                                                    )
                                                })}
                                            </VStack>
                                        ) : (
                                            <Text fontSize="xs" color="gray.500">
                                                {destinationUrl && destAuthStatus !== 'success' ? '🔐 Complete destination authentication first' :
                                                    loadingDestElements ? '🔗 Fetching elements for mapping configuration...' :
                                                        'Select source data elements and destination dataset first'}
                                            </Text>
                                        )}
                                    </FormControl>
                                </SimpleGrid>
                            </Box>
                        </SimpleGrid>

                        {/* Progress Display */}
                        {(isRunning || progressMessage) && (
                            <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200" mb={4}>
                                <Text color="blue.700" fontWeight="medium">
                                    {progressMessage || 'Processing...'}
                                </Text>
                                {isRunning && (
                                    <Box mt={2}>
                                        <Box h="2" bg="blue.200" borderRadius="full">
                                            <Box
                                                h="full"
                                                bg="blue.500"
                                                borderRadius="full"
                                                animation="pulse 1.5s infinite"
                                                w="100%"
                                            />
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        )}

                        <HStack spacing={4}>
                            <Button
                                colorScheme="teal"
                                onClick={() => {
                                    console.log('[DQEngineView] Trigger Now button clicked!')
                                    console.log('[DQEngineView] Button state - isLoading:', runMutation.status === 'pending', 'isDisabled:', !allFilled)

                                    // Parse data element mapping if provided
                                    let parsedMapping: Record<string, string> | undefined
                                    if (dataElementMapping.trim()) {
                                        parsedMapping = {}
                                        dataElementMapping.split(',').forEach(pair => {
                                            const [source, dest] = pair.split(':').map(s => s.trim())
                                            if (source && dest) {
                                                parsedMapping![source] = dest
                                            }
                                        })
                                        console.log('[DQEngineView] ✅ Parsed data element mappings:', {
                                            raw: dataElementMapping,
                                            parsed: parsedMapping,
                                            count: Object.keys(parsedMapping).length
                                        })
                                    } else {
                                        console.log('[DQEngineView] ⚠️ No data element mappings provided - destination posting will be skipped')
                                    }

                                    console.log('[DQEngineView] Form values:', {
                                        sourceUrl,
                                        sourceUser: sourceUser ? '***' : '(empty)',
                                        sourcePass: sourcePass ? '***' : '(empty)',
                                        dataElements: dataElements.split(',').map((d: string) => d.trim()),
                                        datasetDC,
                                        orgUnit,
                                        selectedSourceOrgUnits,
                                        selectedDestOrgUnits,
                                        period,
                                        destinationUrl: destinationUrl || '(none)',
                                        destinationUser: destinationUser ? '***' : '(none)',
                                        dataElementMapping: parsedMapping || '(none)',
                                        allFilled
                                    })

                                    // Format period to DHIS2 format
                                    const formattedPeriod = formatPeriodForDHIS2(period)

                                    // Show conversion toast if format changed
                                    const periodChanged = Array.isArray(period)
                                        ? JSON.stringify(formattedPeriod) !== JSON.stringify(period)
                                        : formattedPeriod !== period

                                    if (periodChanged) {
                                        const periodDisplay = Array.isArray(period) ? period.join(', ') : period
                                        const formattedDisplay = Array.isArray(formattedPeriod) ? formattedPeriod.join(', ') : formattedPeriod
                                        console.log(`[DQEngineView] Converted period "${periodDisplay}" to "${formattedDisplay}"`)
                                        toast({
                                            status: 'info',
                                            title: '📅 Period format converted',
                                            description: `Converted "${periodDisplay}" to DHIS2 format "${formattedDisplay}"`,
                                            duration: 3000
                                        })
                                    }

                                    const params: any = {
                                        sourceUrl,
                                        sourceUser,
                                        sourcePass,
                                        dataElements: dataElements.split(',').map((d: string) => d.trim()),
                                        datasetDC,
                                        orgUnit: selectedSourceOrgUnits.length > 0 ? selectedSourceOrgUnits : [orgUnit], // Pass all selected org units as array
                                        period: formattedPeriod,
                                    }

                                    // Add destination parameters if provided
                                    if (destinationUrl.trim()) {
                                        params.destinationUrl = destinationUrl
                                        params.destinationUser = destinationUser
                                        params.destinationPass = destinationPass
                                        if (destinationDataset.trim()) params.destinationDataset = destinationDataset
                                        if (selectedDestOrgUnits.length > 0) {
                                            params.destinationOrgUnit = selectedDestOrgUnits // Pass all selected destination org units as array
                                        } else if (destinationOrgUnit.trim()) {
                                            params.destinationOrgUnit = destinationOrgUnit.split(',').map((id: string) => id.trim()) // Convert string to array
                                        }
                                        if (parsedMapping) params.dataElementMapping = parsedMapping
                                    }

                                    console.log('[DQEngineView] Final API parameters being sent:', JSON.stringify(params, null, 2))
                                    runMutation.mutate(params)
                                }}
                                isLoading={runMutation.status === 'pending'}
                                isDisabled={!allFilled}
                            >
                                Trigger Now
                            </Button>

                            <Button
                                colorScheme="blue"
                                variant="outline"
                                leftIcon={<FaBell />}
                                onClick={() => {
                                    if (selectedSourceOrgUnits.length > 0) {
                                        // Send test notification for selected org units
                                        const orgUnitId = selectedSourceOrgUnits[0] // Use first selected org unit
                                        const apiBase = import.meta.env.VITE_DQ_ENGINE_URL || 'https://engine.dqas.hispuganda.org'
                                        fetch(`${apiBase}/api/notifications/test-dq`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ orgUnitId })
                                        })
                                            .then(response => response.json())
                                            .then(data => {
                                                toast({
                                                    status: 'success',
                                                    title: 'Test notification sent!',
                                                    description: `Sent to ${data.result?.facilitiesNotified?.length || 0} facilities`,
                                                    duration: 4000
                                                })
                                            })
                                            .catch(error => {
                                                toast({
                                                    status: 'error',
                                                    title: 'Failed to send notification',
                                                    description: error.message,
                                                    duration: 4000
                                                })
                                            })
                                    } else {
                                        toast({
                                            status: 'warning',
                                            title: 'No org unit selected',
                                            description: 'Please select an organization unit first',
                                            duration: 3000
                                        })
                                    }
                                }}
                                isDisabled={selectedSourceOrgUnits.length === 0}
                            >
                                Send Test Notification
                            </Button>

                            <Button
                                colorScheme="orange"
                                variant="outline"
                                leftIcon={<FaSearch />}
                                onClick={async () => {
                                    if (!selectedSourceOrgUnits.length || !selectedSourceDataset || !period || (Array.isArray(period) && period.length === 0)) {
                                        toast({
                                            status: 'warning',
                                            title: 'Missing information',
                                            description: 'Please select dataset, org unit, and period(s) first',
                                            duration: 3000
                                        })
                                        return
                                    }

                                    try {
                                        const apiBase = import.meta.env.VITE_DQ_ENGINE_URL || 'https://engine.dqas.hispuganda.org'
                                        const response = await fetch(`${apiBase}/api/check-data-availability`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                sourceUrl,
                                                sourceUser,
                                                sourcePass,
                                                datasetId: selectedSourceDataset,
                                                orgUnitId: selectedSourceOrgUnits[0],
                                                period: formatPeriodForDHIS2(period)
                                            })
                                        })

                                        const result = await response.json()

                                        if (result.success) {
                                            const summary = result.summary
                                            toast({
                                                status: summary.dataFound ? 'success' : 'warning',
                                                title: '🔍 Data Availability Check',
                                                description: [
                                                    `Dataset: ${summary.datasetName}`,
                                                    `Org Unit: ${summary.orgUnitName}`,
                                                    `Period: ${summary.period}`,
                                                    `Data Found: ${summary.dataFound ? '✅ Yes' : '❌ No'}`,
                                                    `Form Completed: ${summary.formCompleted ? '✅ Yes' : '❌ No'}`
                                                ].join('\n'),
                                                duration: 8000,
                                                isClosable: true
                                            })
                                        } else {
                                            throw new Error(result.error)
                                        }
                                    } catch (error: any) {
                                        toast({
                                            status: 'error',
                                            title: 'Check failed',
                                            description: error.message,
                                            duration: 4000
                                        })
                                    }
                                }}
                                isDisabled={!selectedSourceOrgUnits.length || !selectedSourceDataset || !period || (Array.isArray(period) && period.length === 0)}
                            >
                                Check Data Availability
                            </Button>
                        </HStack>

                        {/* Data Comparison Modal */}
                        {lastSuccessfulRun && (
                            <DataComparisonModal
                                isOpen={comparisonModalOpen}
                                onClose={() => {
                                    setComparisonModalOpen(false)
                                    // Clear the last run data to ensure fresh comparison on next run
                                    setLastSuccessfulRun(null)
                                }}

                                // Source system data from DQ form
                                sourceUrl={sourceUrl}
                                sourceUser={sourceUser}
                                sourcePass={sourcePass}
                                selectedSourceDataset={selectedSourceDataset}
                                selectedSourceOrgUnits={selectedSourceOrgUnits}
                                selectedSourceOrgNames={selectedSourceOrgNames}
                                selectedDataElements={selectedDataElements}
                                period={lastSuccessfulRun.period}

                                // Destination system data from DQ form
                                destinationUrl={lastSuccessfulRun.destinationUrl}
                                destinationUser={lastSuccessfulRun.destinationUser}
                                destinationPass={lastSuccessfulRun.destinationPass}
                                destinationOrgUnit={Array.isArray(lastSuccessfulRun.destinationOrgUnit)
                                    ? lastSuccessfulRun.destinationOrgUnit[0]
                                    : lastSuccessfulRun.destinationOrgUnit}
                                targetDatasetId={lastSuccessfulRun.targetDatasetId}
                                selectedDestOrgUnits={selectedDestOrgUnits}
                                selectedDestOrgNames={selectedDestOrgNames}
                                dataElementMapping={dataElementMapping}

                                // Org unit tree data from DQ form
                                sourceOrgUnitTree={sourceOrgTreeData}
                                destinationOrgUnitTree={destOrgTreeData}
                                
                                // Quick Run dataset configuration
                                isQuickRun={lastSuccessfulRun.isQuickRun}
                                quickRunSelectedDatasets={lastSuccessfulRun.selectedDatasets}
                                quickRunDataElementGroups={lastSuccessfulRun.dataElementGroups}
                            />
                        )}

                        {/* Quick Run Data Comparison Modal */}
                        {quickRunConfig && (
                            <DataComparisonModal
                                isOpen={quickRunModalOpen}
                                onClose={() => {
                                    setQuickRunModalOpen(false)
                                    setQuickRunConfig(null)
                                }}

                                // Pre-populate with saved configuration data
                                sourceUrl={quickRunConfig.sourceUrl || sourceUrl}
                                sourceUser={quickRunConfig.sourceUser || sourceUser}
                                sourcePass={quickRunConfig.sourcePass || sourcePass}
                                selectedSourceDataset={quickRunConfig.selectedSourceDataset || ''}
                                selectedSourceOrgUnits={quickRunConfig.selectedSourceOrgUnits || []}
                                selectedSourceOrgNames={quickRunConfig.selectedSourceOrgNames || []}
                                selectedDataElements={quickRunConfig.selectedDataElements || []}
                                period={quickRunConfig.period || ''}

                                // For Quick Run, use destination system with destination datasets (like manual flow)
                                destinationUrl={quickRunConfig.destinationUrl || ''}
                                destinationUser={quickRunConfig.destinationUser || ''}
                                destinationPass={quickRunConfig.destinationPass || ''}
                                destinationOrgUnit={quickRunConfig.selectedDestOrgUnits?.[0] || quickRunConfig.selectedSourceOrgUnits?.[0] || ''}
                                targetDatasetId={quickRunConfig.selectedDestDataset || ''}
                                selectedDestOrgUnits={quickRunConfig.selectedDestOrgUnits || []}
                                selectedDestOrgNames={quickRunConfig.selectedDestOrgNames || []}
                                dataElementMapping={quickRunConfig.dataElementMapping || ''}

                                // Org unit tree data from saved configuration
                                sourceOrgUnitTree={quickRunConfig.sourceOrgUnitTree || []}
                                destinationOrgUnitTree={quickRunConfig.destinationOrgUnitTree || []}

                                // Flag to indicate this is Quick Run (skip save configuration modal)
                                isQuickRun={true}
                                // Use destination datasets when querying destination server (like manual flow)
                                quickRunSelectedDatasets={quickRunConfig.selectedDatasets || []}
                                quickRunDataElementGroups={quickRunConfig.dataElementGroups || []}
                            />
                        )}
                    </TabPanel>

                    <TabPanel>
                        {schedLoading ? (
                            <Box>Loading…</Box>
                        ) : (
                            <>
                                <Table variant="simple" size="sm" mb={4}>
                                    <Thead>
                                        <Tr><Th>ID</Th><Th>Cron</Th><Th>Name</Th><Th>Enabled</Th></Tr>
                                    </Thead>
                                    <Tbody>
                                        {schedules.map(s => (
                                            <Tr key={s.id}>
                                                <Td>{s.id}</Td><Td>{s.cron}</Td>
                                                <Td>{s.name}</Td><Td>{s.enabled ? '✅' : '❌'}</Td>
                                            </Tr>
                                        ))}
                                    </Tbody>
                                </Table>
                                <Button
                                    size="sm"
                                    colorScheme="teal"
                                    onClick={() => createSched.mutate({ cron: '0 */6 * * *', name: 'Every 6h' })}
                                    isLoading={createSched.status === 'pending'}
                                >
                                    + Add 6-hourly Job
                                </Button>
                            </>
                        )}
                    </TabPanel>

                    <TabPanel>
                        <NotificationManagement />
                    </TabPanel>

                </TabPanels>
            </Tabs>

        </Box>
    )
}
