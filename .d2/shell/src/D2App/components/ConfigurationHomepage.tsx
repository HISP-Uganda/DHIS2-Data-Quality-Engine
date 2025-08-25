import React, { useState } from 'react'
import {
    Box, VStack, HStack, Text, Button, Card, CardBody, Badge, Alert, AlertIcon,
    Spinner, useToast, SimpleGrid, Icon, Divider, Flex, Menu, MenuButton, MenuList,
    MenuItem, IconButton, useDisclosure, Modal, ModalOverlay, ModalContent,
    ModalHeader, ModalBody, ModalCloseButton, Input, FormControl, FormLabel,
    Textarea, Select
} from '@chakra-ui/react'
import { FaPlus, FaPlay, FaEdit, FaTrash, FaCog, FaRocket, FaCalendar, FaDatabase, FaEllipsisV, FaBookmark, FaSync } from 'react-icons/fa'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
    getSavedConfigurations, 
    deleteConfiguration, 
    toggleConfigurationStatus, 
    runSavedConfiguration,
    updateConfiguration,
    getConfiguration,
    type SavedConfigurationSummary,
    type ComparisonConfiguration 
} from '../api'
import OrgUnitTreeSelector from './OrgUnitTreeSelector'

interface ConfigurationHomepageProps {
    onCreateNew: () => void
    onRunConfiguration: (configId: string, configName: string) => void
    onQuickRunComparison: (config: ComparisonConfiguration) => void
}

export default function ConfigurationHomepage({ 
    onCreateNew, 
    onRunConfiguration,
    onQuickRunComparison
}: ConfigurationHomepageProps) {
    const toast = useToast()
    const queryClient = useQueryClient()
    // Keep selected config for other operations (like edit)
    const [selectedConfig, setSelectedConfig] = useState<SavedConfigurationSummary | null>(null)
    
    // Edit configuration state
    const [editingConfig, setEditingConfig] = useState<ComparisonConfiguration | null>(null)
    const [editFormData, setEditFormData] = useState<Partial<ComparisonConfiguration>>({})
    
    const { isOpen: isEditModalOpen, onOpen: onOpenEditModal, onClose: onCloseEditModal } = useDisclosure()

    // Query to fetch saved configurations
    const { data: configurations = [], isLoading, refetch } = useQuery({
        queryKey: ['saved-configurations'],
        queryFn: getSavedConfigurations,
        staleTime: 2 * 60 * 1000,
    })

    // Separate active and inactive configurations
    const activeConfigurations = configurations.filter(config => config.isActive)
    const inactiveConfigurations = configurations.filter(config => !config.isActive)

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: deleteConfiguration,
        onSuccess: (_, configId) => {
            const config = configurations.find(c => c.id === configId)
            toast({
                title: 'Configuration Deleted',
                description: `"${config?.name}" has been deleted`,
                status: 'success',
                duration: 3000
            })
            queryClient.invalidateQueries({ queryKey: ['saved-configurations'] })
        },
        onError: (error: Error) => {
            toast({
                title: 'Delete Failed',
                description: error.message,
                status: 'error',
                duration: 4000
            })
        }
    })

    // Toggle status mutation
    const toggleMutation = useMutation({
        mutationFn: toggleConfigurationStatus,
        onSuccess: (updatedConfig) => {
            toast({
                title: `Configuration ${updatedConfig.isActive ? 'Activated' : 'Deactivated'}`,
                description: `"${updatedConfig.name}" is now ${updatedConfig.isActive ? 'active' : 'inactive'}`,
                status: 'info',
                duration: 3000
            })
            queryClient.invalidateQueries({ queryKey: ['saved-configurations'] })
        },
        onError: (error: Error) => {
            toast({
                title: 'Toggle Failed',
                description: error.message,
                status: 'error',
                duration: 4000
            })
        }
    })

    // Removed runMutation - Quick Run now opens DataComparisonModal directly

    // Edit configuration mutation
    const editMutation = useMutation({
        mutationFn: (params: { id: string; updates: Partial<ComparisonConfiguration> }) =>
            updateConfiguration(params.id, params.updates),
        onSuccess: (data) => {
            toast({
                title: 'Configuration Updated!',
                description: `"${data.name}" has been updated successfully`,
                status: 'success',
                duration: 4000
            })
            refetch()
            onCloseEditModal()
            setEditingConfig(null)
            setEditFormData({})
        },
        onError: (error: Error) => {
            toast({
                title: 'Update Failed',
                description: error.message,
                status: 'error',
                duration: 4000
            })
        }
    })

    const handleEditConfiguration = async (config: SavedConfigurationSummary) => {
        try {
            const fullConfig = await getConfiguration(config.id)
            setEditingConfig(fullConfig)
            setEditFormData({
                name: fullConfig.name,
                description: fullConfig.description,
                selectedSourceOrgUnits: fullConfig.selectedSourceOrgUnits,
                selectedSourceOrgNames: fullConfig.selectedSourceOrgNames,
                period: fullConfig.period,
                selectedDestOrgUnits: fullConfig.selectedDestOrgUnits,
                selectedDestOrgNames: fullConfig.selectedDestOrgNames
            })
            onOpenEditModal()
        } catch (error: any) {
            toast({
                title: 'Load Failed',
                description: error.message,
                status: 'error',
                duration: 4000
            })
        }
    }

    const handleQuickRun = async (config: SavedConfigurationSummary) => {
        try {
            console.log('Quick Run: Loading configuration and triggering manual DQ execution process')
            
            // Load full configuration to get all saved parameters
            const fullConfig = await getConfiguration(config.id)
            console.log('Quick Run - Full config loaded:', fullConfig)
            
            toast({
                title: 'Quick Run Started!',
                description: `Loading configuration "${config.name}" and executing DQ process...`,
                status: 'info',
                duration: 4000
            })
            
            // Instead of calling separate API, trigger the manual DQ execution with saved params
            // This ensures we use the exact same execution path that works in manual mode
            onRunConfiguration(config.id, config.name)
            
        } catch (error: any) {
            console.error('Quick Run execution error:', error)
            toast({
                title: 'Quick Run Failed',
                description: error.message,
                status: 'error',
                duration: 4000
            })
        }
    }

    // Removed handleRunConfiguration - Quick Run now opens DataComparisonModal directly

    const ConfigurationCard = ({ config }: { config: SavedConfigurationSummary }) => (
        <Card 
            key={config.id}
            border="1px" 
            borderColor={config.isActive ? "green.200" : "gray.200"}
            bg={config.isActive ? "white" : "gray.50"}
            _hover={{ borderColor: config.isActive ? "green.300" : "gray.300" }}
        >
            <CardBody>
                <VStack align="stretch" spacing={3}>
                    <HStack justify="space-between" align="start">
                        <VStack align="start" spacing={1} flex="1">
                            <HStack spacing={2}>
                                <Icon as={FaBookmark} color={config.isActive ? "green.500" : "gray.400"} />
                                <Text fontWeight="bold" fontSize="md">
                                    {config.name}
                                </Text>
                                <Badge 
                                    colorScheme={config.isActive ? "green" : "gray"}
                                    size="sm"
                                >
                                    {config.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </HStack>
                            
                            {config.description && (
                                <Text fontSize="sm" color="gray.600" noOfLines={2}>
                                    {config.description}
                                </Text>
                            )}
                        </VStack>

                        <Menu>
                            <MenuButton
                                as={IconButton}
                                aria-label="Configuration options"
                                icon={<FaEllipsisV />}
                                variant="ghost"
                                size="sm"
                            />
                            <MenuList>
                                <MenuItem 
                                    icon={<FaPlay />} 
                                    onClick={() => handleQuickRun(config)}
                                    isDisabled={!config.isActive}
                                >
                                    Quick Run
                                </MenuItem>
                                <MenuItem 
                                    icon={<FaEdit />} 
                                    onClick={() => handleEditConfiguration(config)}
                                >
                                    Edit
                                </MenuItem>
                                <MenuItem 
                                    icon={<FaCog />}
                                    onClick={() => toggleMutation.mutate(config.id)}
                                >
                                    {config.isActive ? 'Deactivate' : 'Activate'}
                                </MenuItem>
                                <Divider />
                                <MenuItem 
                                    icon={<FaTrash />} 
                                    color="red.500"
                                    onClick={() => {
                                        if (window.confirm(`Are you sure you want to delete "${config.name}"?`)) {
                                            deleteMutation.mutate(config.id)
                                        }
                                    }}
                                >
                                    Delete
                                </MenuItem>
                            </MenuList>
                        </Menu>
                    </HStack>

                    {/* Configuration Stats */}
                    <HStack spacing={6} fontSize="sm" color="gray.600">
                        <HStack spacing={1}>
                            <Icon as={FaDatabase} />
                            <Text>{config.datasetCount} datasets</Text>
                        </HStack>
                        <HStack spacing={1}>
                            <Icon as={FaRocket} />
                            <Text>{config.groupCount} elements</Text>
                        </HStack>
                        <HStack spacing={1}>
                            <Icon as={FaCalendar} />
                            <Text>{new Date(config.createdAt).toLocaleDateString()}</Text>
                        </HStack>
                    </HStack>

                    {config.lastRunAt && (
                        <Text fontSize="xs" color="green.600">
                            ✅ Last run: {new Date(config.lastRunAt).toLocaleDateString()}
                        </Text>
                    )}

                    {/* Quick Run Button for Active Configs */}
                    {config.isActive && (
                        <Button
                            size="sm"
                            colorScheme="green"
                            leftIcon={<FaPlay />}
                            onClick={() => handleQuickRun(config)}
                            isFullWidth
                        >
                            Quick Run
                        </Button>
                    )}
                </VStack>
            </CardBody>
        </Card>
    )

    if (isLoading) {
        return (
            <Box textAlign="center" py={10}>
                <Spinner size="lg" color="purple.500" />
                <Text mt={4} fontSize="lg">Loading configurations...</Text>
            </Box>
        )
    }

    return (
        <Box p={6}>
            <VStack align="stretch" spacing={6}>
                {/* Header */}
                <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={1}>
                        <Text fontSize="2xl" fontWeight="bold" color="purple.700">
                            Data Comparison Configurations
                        </Text>
                        <Text color="gray.600">
                            Manage and run your saved data comparison configurations
                        </Text>
                    </VStack>
                    
                    <Button
                        colorScheme="purple"
                        leftIcon={<FaPlus />}
                        onClick={onCreateNew}
                        size="lg"
                    >
                        Add Configuration
                    </Button>
                </Flex>

                {/* No Configurations State */}
                {configurations.length === 0 && (
                    <Alert status="info" borderRadius="md" py={8}>
                        <AlertIcon />
                        <VStack align="start" spacing={3}>
                            <Text fontWeight="medium" fontSize="lg">Welcome to Configuration Management!</Text>
                            <Text>
                                Create your first data comparison configuration to get started. 
                                Configurations save your dataset selections and data element mappings 
                                for quick reuse.
                            </Text>
                            <Button
                                colorScheme="purple"
                                leftIcon={<FaPlus />}
                                onClick={onCreateNew}
                                mt={2}
                            >
                                Create Your First Configuration
                            </Button>
                        </VStack>
                    </Alert>
                )}

                {/* Active Configurations */}
                {activeConfigurations.length > 0 && (
                    <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between">
                            <Text fontSize="lg" fontWeight="semibold">
                                Active Configurations ({activeConfigurations.length})
                            </Text>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => refetch()}
                                leftIcon={<Icon as={FaSync} />}
                            >
                                Refresh
                            </Button>
                        </HStack>
                        
                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                            {activeConfigurations.map(config => (
                                <ConfigurationCard key={config.id} config={config} />
                            ))}
                        </SimpleGrid>
                    </VStack>
                )}

                {/* Inactive Configurations */}
                {inactiveConfigurations.length > 0 && (
                    <VStack align="stretch" spacing={4}>
                        <Text fontSize="lg" fontWeight="semibold" color="gray.500">
                            Inactive Configurations ({inactiveConfigurations.length})
                        </Text>
                        
                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                            {inactiveConfigurations.map(config => (
                                <ConfigurationCard key={config.id} config={config} />
                            ))}
                        </SimpleGrid>
                    </VStack>
                )}
            </VStack>

            {/* Quick Run Modal removed - now opens DataComparisonModal directly */}
            
            {/* Edit Configuration Modal */}
            <Modal isOpen={isEditModalOpen} onClose={onCloseEditModal} size="lg">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Edit Configuration</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody pb={6}>
                        {editingConfig && (
                            <VStack spacing={4} align="stretch">
                                <Alert status="info" borderRadius="md">
                                    <AlertIcon />
                                    <VStack align="start" spacing={1}>
                                        <Text fontWeight="medium">Editing: {editingConfig.name}</Text>
                                        <Text fontSize="sm">
                                            You can update the configuration details below
                                        </Text>
                                    </VStack>
                                </Alert>

                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                    <FormControl isRequired>
                                        <FormLabel>Configuration Name</FormLabel>
                                        <Input
                                            value={editFormData.name || ''}
                                            onChange={(e) => setEditFormData(prev => ({...prev, name: e.target.value}))}
                                            placeholder="Configuration name"
                                        />
                                    </FormControl>

                                    <FormControl>
                                        <FormLabel>Period</FormLabel>
                                        <Input
                                            value={editFormData.period || ''}
                                            onChange={(e) => setEditFormData(prev => ({...prev, period: e.target.value}))}
                                            placeholder="e.g., 202501"
                                        />
                                    </FormControl>
                                </SimpleGrid>

                                <FormControl>
                                    <FormLabel>Description</FormLabel>
                                    <Textarea
                                        value={editFormData.description || ''}
                                        onChange={(e) => setEditFormData(prev => ({...prev, description: e.target.value}))}
                                        placeholder="Configuration description"
                                        rows={3}
                                    />
                                </FormControl>

                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                    <Box>
                                        <Text fontSize="sm" fontWeight="medium" mb={2}>Source Org Units</Text>
                                        <Text fontSize="xs" color="gray.600" mb={2}>
                                            Current: {editingConfig.selectedSourceOrgNames?.join(', ') || 'None selected'}
                                        </Text>
                                        <Text fontSize="xs" color="gray.500">
                                            To change org units, create a new configuration
                                        </Text>
                                    </Box>
                                    
                                    <Box>
                                        <Text fontSize="sm" fontWeight="medium" mb={2}>Destination Org Units</Text>
                                        <Text fontSize="xs" color="gray.600" mb={2}>
                                            Current: {editingConfig.selectedDestOrgNames?.join(', ') || 'None selected'}
                                        </Text>
                                        <Text fontSize="xs" color="gray.500">
                                            To change org units, create a new configuration
                                        </Text>
                                    </Box>
                                </SimpleGrid>

                                <Alert status="warning" borderRadius="md">
                                    <AlertIcon />
                                    <VStack align="start" spacing={1}>
                                        <Text fontSize="sm" fontWeight="medium">Note:</Text>
                                        <Text fontSize="xs">
                                            Currently you can edit name, description, and period. 
                                            To change org units or data elements, create a new configuration.
                                        </Text>
                                    </VStack>
                                </Alert>

                                <HStack justify="space-between" pt={4}>
                                    <Button onClick={onCloseEditModal}>Cancel</Button>
                                    <Button
                                        colorScheme="blue"
                                        leftIcon={<FaEdit />}
                                        onClick={() => {
                                            if (!editFormData.name?.trim()) {
                                                toast({
                                                    title: 'Name Required',
                                                    description: 'Please enter a configuration name',
                                                    status: 'warning',
                                                    duration: 3000
                                                })
                                                return
                                            }
                                            
                                            editMutation.mutate({
                                                id: editingConfig.id,
                                                updates: {
                                                    name: editFormData.name.trim(),
                                                    description: editFormData.description?.trim() || undefined,
                                                    period: editFormData.period?.trim() || editingConfig.period,
                                                    updatedAt: new Date().toISOString()
                                                }
                                            })
                                        }}
                                        isLoading={editMutation.isPending}
                                        isDisabled={!editFormData.name?.trim()}
                                    >
                                        Update Configuration
                                    </Button>
                                </HStack>
                            </VStack>
                        )}
                    </ModalBody>
                </ModalContent>
            </Modal>
        </Box>
    )
}