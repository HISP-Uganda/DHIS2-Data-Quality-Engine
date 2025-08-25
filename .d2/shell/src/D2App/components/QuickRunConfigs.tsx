import React, { useState } from 'react'
import {
    Box, VStack, HStack, Text, Button, Card, CardBody, Badge, Alert, AlertIcon,
    Spinner, useToast, Select, Input, FormControl, FormLabel, Flex, Icon
} from '@chakra-ui/react'
import { FaPlay, FaRocket, FaCheck } from 'react-icons/fa'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getSavedConfigurations, runSavedConfiguration, type SavedConfigurationSummary } from '../api'

interface QuickRunConfigsProps {
    currentOrgUnit?: string
    currentPeriod?: string
    onConfigRun?: (configId: string, configName: string) => void
}

export default function QuickRunConfigs({ 
    currentOrgUnit, 
    currentPeriod, 
    onConfigRun 
}: QuickRunConfigsProps) {
    const toast = useToast()
    const [selectedConfigId, setSelectedConfigId] = useState<string>('')
    const [runOrgUnit, setRunOrgUnit] = useState(currentOrgUnit || '')
    const [runPeriod, setRunPeriod] = useState(currentPeriod || '')

    // Query to fetch saved configurations
    const { data: savedConfigurations = [], isLoading: loadingConfigs, refetch } = useQuery({
        queryKey: ['saved-configurations'],
        queryFn: getSavedConfigurations,
        staleTime: 2 * 60 * 1000,
    })

    // Filter only active configurations
    const activeConfigurations = savedConfigurations.filter(config => config.isActive)

    // Mutation for running saved configuration
    const runConfigMutation = useMutation({
        mutationFn: async (params: { configId: string; orgUnit: string; period: string }) => {
            return runSavedConfiguration(params.configId, {
                orgUnit: params.orgUnit,
                period: params.period
            })
        },
        onSuccess: (data) => {
            toast({
                title: 'Configuration Running!',
                description: data.message,
                status: 'success',
                duration: 4000
            })
            onConfigRun?.(data.configurationId, data.configurationName)
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

    const handleQuickRun = () => {
        if (!selectedConfigId) {
            toast({
                title: 'Configuration Required',
                description: 'Please select a configuration to run',
                status: 'warning',
                duration: 3000
            })
            return
        }

        if (!runOrgUnit || !runPeriod) {
            toast({
                title: 'Parameters Required',
                description: 'Please specify organization unit and period',
                status: 'warning',
                duration: 3000
            })
            return
        }

        runConfigMutation.mutate({
            configId: selectedConfigId,
            orgUnit: runOrgUnit,
            period: runPeriod
        })
    }

    if (loadingConfigs) {
        return (
            <Card>
                <CardBody>
                    <Flex justify="center" py={4}>
                        <VStack spacing={3}>
                            <Spinner color="purple.500" />
                            <Text fontSize="sm">Loading configurations...</Text>
                        </VStack>
                    </Flex>
                </CardBody>
            </Card>
        )
    }

    if (activeConfigurations.length === 0) {
        return (
            <Card>
                <CardBody>
                    <Alert status="info">
                        <AlertIcon />
                        <VStack align="start" spacing={1}>
                            <Text fontWeight="medium">No Quick-Run Configurations</Text>
                            <Text fontSize="sm">
                                Save comparison configurations to quickly run them here.
                            </Text>
                        </VStack>
                    </Alert>
                </CardBody>
            </Card>
        )
    }

    return (
        <Card>
            <CardBody>
                <VStack spacing={4} align="stretch">
                    <HStack justify="space-between" align="center">
                        <VStack align="start" spacing={1}>
                            <Text fontWeight="bold" color="purple.700">
                                <Icon as={FaRocket} mr={2} />
                                Quick Run Configurations
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                                Run saved comparison configurations with one click
                            </Text>
                        </VStack>
                        <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => refetch()}
                            isLoading={loadingConfigs}
                        >
                            Refresh
                        </Button>
                    </HStack>

                    <VStack spacing={3} align="stretch">
                        {/* Configuration Selection */}
                        <FormControl>
                            <FormLabel fontSize="sm">Configuration</FormLabel>
                            <Select
                                placeholder="Select a saved configuration..."
                                value={selectedConfigId}
                                onChange={(e) => setSelectedConfigId(e.target.value)}
                                size="sm"
                            >
                                {activeConfigurations.map((config) => (
                                    <option key={config.id} value={config.id}>
                                        {config.name} ({config.datasetCount} datasets, {config.groupCount} elements)
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Quick Parameters */}
                        <HStack spacing={3}>
                            <FormControl flex="1">
                                <FormLabel fontSize="sm">Org Unit ID</FormLabel>
                                <Input
                                    size="sm"
                                    value={runOrgUnit}
                                    onChange={(e) => setRunOrgUnit(e.target.value)}
                                    placeholder="e.g., ImspTQPwCqd"
                                />
                            </FormControl>
                            <FormControl flex="1">
                                <FormLabel fontSize="sm">Period</FormLabel>
                                <Input
                                    size="sm"
                                    value={runPeriod}
                                    onChange={(e) => setRunPeriod(e.target.value)}
                                    placeholder="e.g., 202501"
                                />
                            </FormControl>
                        </HStack>

                        {/* Selected Configuration Info */}
                        {selectedConfigId && (
                            <Box p={3} bg="purple.50" borderRadius="md" border="1px" borderColor="purple.200">
                                {(() => {
                                    const selectedConfig = activeConfigurations.find(c => c.id === selectedConfigId)
                                    if (!selectedConfig) return null
                                    
                                    return (
                                        <VStack align="start" spacing={1}>
                                            <HStack spacing={2}>
                                                <Text fontSize="sm" fontWeight="medium" color="purple.700">
                                                    {selectedConfig.name}
                                                </Text>
                                                <Badge colorScheme="green" size="sm">Active</Badge>
                                            </HStack>
                                            {selectedConfig.description && (
                                                <Text fontSize="xs" color="gray.600">
                                                    {selectedConfig.description}
                                                </Text>
                                            )}
                                            <HStack spacing={4} fontSize="xs" color="gray.500">
                                                <Text>📊 {selectedConfig.datasetCount} datasets</Text>
                                                <Text>🔗 {selectedConfig.groupCount} elements</Text>
                                                <Text>📅 Created: {new Date(selectedConfig.createdAt).toLocaleDateString()}</Text>
                                                {selectedConfig.lastRunAt && (
                                                    <Text color="green.500">
                                                        ✅ Last run: {new Date(selectedConfig.lastRunAt).toLocaleDateString()}
                                                    </Text>
                                                )}
                                            </HStack>
                                        </VStack>
                                    )
                                })()}
                            </Box>
                        )}

                        {/* Run Button */}
                        <Button
                            colorScheme="purple"
                            leftIcon={<FaPlay />}
                            size="sm"
                            onClick={handleQuickRun}
                            isLoading={runConfigMutation.isPending}
                            loadingText="Running..."
                            isDisabled={!selectedConfigId || !runOrgUnit || !runPeriod}
                        >
                            Quick Run Comparison
                        </Button>
                    </VStack>
                </VStack>
            </CardBody>
        </Card>
    )
}