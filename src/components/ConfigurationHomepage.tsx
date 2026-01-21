import React, { useState } from 'react'
import {
    Box, VStack, HStack, Text, Button, Badge, Alert, AlertIcon,
    Spinner, useToast, Icon, Flex, Menu, MenuButton, MenuList,
    MenuItem, IconButton, Table, Thead, Tbody, Tr, Th, Td
} from '@chakra-ui/react'
import { FaPlus, FaPlay, FaEdit, FaTrash, FaCog, FaRocket, FaCalendar, FaDatabase, FaEllipsisV, FaBookmark, FaSync, FaCopy } from 'react-icons/fa'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getSavedConfigurations,
    deleteConfiguration,
    toggleConfigurationStatus,
    updateConfiguration,
    getConfiguration,
    saveConfiguration,
    type SavedConfigurationSummary,
    type ComparisonConfiguration
} from '../api'

interface ConfigurationHomepageProps {
    onCreateNew: () => void
    onRunConfiguration: (configId: string, configName: string) => void
    onEditConfiguration: (configId: string) => void
}

export default function ConfigurationHomepage({
    onCreateNew,
    onRunConfiguration,
    onEditConfiguration
}: ConfigurationHomepageProps) {
    const toast = useToast()
    const queryClient = useQueryClient()

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

    // Clone configuration mutation
    const cloneMutation = useMutation({
        mutationFn: async (configId: string) => {
            const fullConfig = await getConfiguration(configId)
            const clonedConfig = {
                ...fullConfig,
                name: `${fullConfig.name} (Copy)`,
                description: fullConfig.description ? `${fullConfig.description} (Cloned)` : 'Cloned configuration',
                isActive: false, // Start cloned configs as inactive
                lastRunAt: undefined
            }
            // Remove fields that shouldn't be copied
            delete (clonedConfig as any).id
            delete (clonedConfig as any).createdAt
            delete (clonedConfig as any).updatedAt

            return saveConfiguration(clonedConfig)
        },
        onSuccess: (data) => {
            toast({
                title: 'Configuration Cloned!',
                description: `"${data.name}" has been created as a copy`,
                status: 'success',
                duration: 4000
            })
            queryClient.invalidateQueries({ queryKey: ['saved-configurations'] })
        },
        onError: (error: Error) => {
            toast({
                title: 'Clone Failed',
                description: error.message,
                status: 'error',
                duration: 4000
            })
        }
    })

    const handleEditConfiguration = (config: SavedConfigurationSummary) => {
        // Open the full manual configuration interface with this config loaded
        onEditConfiguration(config.id)
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

    const ConfigurationRow = ({ config }: { config: SavedConfigurationSummary }) => (
        <Tr
            key={config.id}
            bg={config.isActive ? "white" : "gray.50"}
            _hover={{ bg: config.isActive ? "green.50" : "gray.100" }}
        >
            <Td>
                <HStack spacing={2}>
                    <Icon as={FaBookmark} color={config.isActive ? "green.500" : "gray.400"} />
                    <VStack align="start" spacing={0}>
                        <Text fontWeight="medium" fontSize="sm">{config.name}</Text>
                        {config.description && (
                            <Text fontSize="xs" color="gray.500" noOfLines={1}>
                                {config.description}
                            </Text>
                        )}
                    </VStack>
                </HStack>
            </Td>
            <Td>
                <Badge colorScheme={config.isActive ? "green" : "gray"} size="sm">
                    {config.isActive ? "Active" : "Inactive"}
                </Badge>
            </Td>
            <Td fontSize="sm" color="gray.600">
                <HStack spacing={1}>
                    <Icon as={FaDatabase} boxSize={3} />
                    <Text>{config.datasetCount}</Text>
                </HStack>
            </Td>
            <Td fontSize="sm" color="gray.600">
                <HStack spacing={1}>
                    <Icon as={FaRocket} boxSize={3} />
                    <Text>{config.groupCount}</Text>
                </HStack>
            </Td>
            <Td fontSize="xs" color="gray.500">
                {new Date(config.createdAt).toLocaleDateString()}
            </Td>
            <Td fontSize="xs" color={config.lastRunAt ? "green.600" : "gray.400"}>
                {config.lastRunAt ? new Date(config.lastRunAt).toLocaleDateString() : 'Never'}
            </Td>
            <Td>
                <HStack spacing={2}>
                    <Button
                        size="xs"
                        colorScheme="green"
                        leftIcon={<FaPlay />}
                        onClick={() => handleQuickRun(config)}
                        isDisabled={!config.isActive}
                    >
                        Run
                    </Button>
                    <IconButton
                        size="xs"
                        icon={<FaEdit />}
                        aria-label="Edit"
                        onClick={() => handleEditConfiguration(config)}
                    />
                    <IconButton
                        size="xs"
                        icon={<FaCopy />}
                        aria-label="Clone"
                        onClick={() => cloneMutation.mutate(config.id)}
                    />
                    <Menu>
                        <MenuButton
                            as={IconButton}
                            icon={<FaEllipsisV />}
                            size="xs"
                            variant="ghost"
                            aria-label="More actions"
                        />
                        <MenuList>
                            <MenuItem
                                icon={<FaCog />}
                                onClick={() => toggleMutation.mutate(config.id)}
                            >
                                {config.isActive ? 'Deactivate' : 'Activate'}
                            </MenuItem>
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
            </Td>
        </Tr>
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

                {/* Configurations Table */}
                {configurations.length > 0 && (
                    <VStack align="stretch" spacing={4}>
                        <HStack justify="space-between">
                            <Text fontSize="lg" fontWeight="semibold">
                                Saved Configurations ({configurations.length})
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

                        <Box overflowX="auto" border="1px" borderColor="gray.200" borderRadius="md">
                            <Table size="sm" variant="simple">
                                <Thead bg="gray.50">
                                    <Tr>
                                        <Th>Name</Th>
                                        <Th>Status</Th>
                                        <Th>Datasets</Th>
                                        <Th>Elements</Th>
                                        <Th>Created</Th>
                                        <Th>Last Run</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {activeConfigurations.map(config => (
                                        <ConfigurationRow key={config.id} config={config} />
                                    ))}
                                    {inactiveConfigurations.map(config => (
                                        <ConfigurationRow key={config.id} config={config} />
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>
                    </VStack>
                )}
            </VStack>
        </Box>
    )
}