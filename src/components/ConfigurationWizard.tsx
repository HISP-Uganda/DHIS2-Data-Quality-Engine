import React, { useState } from 'react'
import {
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, Button, VStack, HStack, Text, Input, Textarea,
    FormControl, FormLabel, Stepper, Step, StepIndicator,
    StepStatus, StepIcon, StepNumber, StepTitle, StepDescription,
    StepSeparator, useSteps, Box, Alert, AlertIcon, Badge, useToast
} from '@chakra-ui/react'
import { FaArrowRight, FaArrowLeft, FaSave } from 'react-icons/fa'
import DataComparisonModal from './DataComparisonModal'

interface ConfigurationWizardProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (configId: string, configName: string) => void
}

export default function ConfigurationWizard({ 
    isOpen, 
    onClose, 
    onSuccess 
}: ConfigurationWizardProps) {
    const toast = useToast()
    
    // Wizard steps
    const steps = [
        { title: 'Basic Info', description: 'Name and description' },
        { title: 'Connection', description: 'DHIS2 connection details' },
        { title: 'Datasets & Mapping', description: 'Select datasets and create mappings' },
        { title: 'Review & Save', description: 'Review and save configuration' }
    ]
    
    const { activeStep, setActiveStep } = useSteps({
        index: 0,
        count: steps.length,
    })
    
    // Form state
    const [configName, setConfigName] = useState('')
    const [configDescription, setConfigDescription] = useState('')
    const [destinationUrl, setDestinationUrl] = useState('')
    const [destinationUser, setDestinationUser] = useState('')
    const [destinationPass, setDestinationPass] = useState('')
    const [showComparisonModal, setShowComparisonModal] = useState(false)
    const [comparisonComplete, setComparisonComplete] = useState(false)
    const [selectedDatasets, setSelectedDatasets] = useState<string[]>([])
    const [dataElementGroups, setDataElementGroups] = useState<any[]>([])

    const handleNext = () => {
        if (activeStep === 2) {
            // Open comparison modal for dataset selection and mapping
            setShowComparisonModal(true)
        } else {
            setActiveStep(Math.min(activeStep + 1, steps.length - 1))
        }
    }

    const handleBack = () => {
        setActiveStep(Math.max(activeStep - 1, 0))
    }

    const handleReset = () => {
        setActiveStep(0)
        setConfigName('')
        setConfigDescription('')
        setDestinationUrl('')
        setDestinationUser('')
        setDestinationPass('')
        setSelectedDatasets([])
        setDataElementGroups([])
        setComparisonComplete(false)
    }

    const handleClose = () => {
        handleReset()
        onClose()
    }

    const isStepValid = () => {
        switch (activeStep) {
            case 0:
                return configName.trim().length > 0
            case 1:
                return destinationUrl.trim().length > 0 && 
                       destinationUser.trim().length > 0 && 
                       destinationPass.trim().length > 0
            case 2:
                return comparisonComplete && selectedDatasets.length > 0 && dataElementGroups.length > 0
            case 3:
                return true
            default:
                return false
        }
    }

    const handleComparisonComplete = (datasets: string[], groups: any[]) => {
        setSelectedDatasets(datasets)
        setDataElementGroups(groups)
        setComparisonComplete(true)
        setShowComparisonModal(false)
        setActiveStep(3) // Move to review step
    }

    const handleSaveConfiguration = async () => {
        try {
            const configData = {
                name: configName.trim(),
                description: configDescription.trim() || undefined,
                type: 'comparison',
                destinationUrl,
                destinationUser,
                destinationPass,
                selectedDatasets,
                dataElementGroups,
                isActive: true
            }

            const response = await fetch('http://localhost:4000/api/comparison-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData)
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to save configuration')
            }

            const savedConfig = await response.json()
            
            toast({
                title: 'Configuration Saved!',
                description: `"${configName}" has been saved successfully`,
                status: 'success',
                duration: 4000
            })

            onSuccess(savedConfig.id, savedConfig.name)
            handleClose()

        } catch (error: any) {
            toast({
                title: 'Save Failed',
                description: error.message,
                status: 'error',
                duration: 4000
            })
        }
    }

    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <VStack spacing={4} align="stretch">
                        <Text fontSize="lg" fontWeight="medium">Basic Information</Text>
                        <FormControl isRequired>
                            <FormLabel>Configuration Name</FormLabel>
                            <Input
                                value={configName}
                                onChange={(e) => setConfigName(e.target.value)}
                                placeholder="e.g., Monthly HMIS Comparison"
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>Description (Optional)</FormLabel>
                            <Textarea
                                value={configDescription}
                                onChange={(e) => setConfigDescription(e.target.value)}
                                placeholder="Brief description of what this configuration does..."
                                rows={3}
                            />
                        </FormControl>
                    </VStack>
                )

            case 1:
                return (
                    <VStack spacing={4} align="stretch">
                        <Text fontSize="lg" fontWeight="medium">DHIS2 Connection Details</Text>
                        <Alert status="info">
                            <AlertIcon />
                            <Text fontSize="sm">
                                Enter the DHIS2 instance details where you want to fetch data for comparison.
                            </Text>
                        </Alert>
                        
                        <FormControl isRequired>
                            <FormLabel>DHIS2 URL</FormLabel>
                            <Input
                                value={destinationUrl}
                                onChange={(e) => setDestinationUrl(e.target.value)}
                                placeholder="https://dhis2-instance.com"
                            />
                        </FormControl>
                        
                        <FormControl isRequired>
                            <FormLabel>Username</FormLabel>
                            <Input
                                value={destinationUser}
                                onChange={(e) => setDestinationUser(e.target.value)}
                                placeholder="admin"
                            />
                        </FormControl>
                        
                        <FormControl isRequired>
                            <FormLabel>Password</FormLabel>
                            <Input
                                type="password"
                                value={destinationPass}
                                onChange={(e) => setDestinationPass(e.target.value)}
                                placeholder="••••••••"
                            />
                        </FormControl>
                    </VStack>
                )

            case 2:
                return (
                    <VStack spacing={4} align="stretch">
                        <Text fontSize="lg" fontWeight="medium">Dataset Selection & Mapping</Text>
                        <Alert status="info">
                            <AlertIcon />
                            <Text fontSize="sm">
                                Click "Open Dataset Mapping" to select datasets and create data element mappings.
                            </Text>
                        </Alert>
                        
                        <Button
                            colorScheme="purple"
                            onClick={() => setShowComparisonModal(true)}
                        >
                            Open Dataset Mapping
                        </Button>
                        
                        {comparisonComplete && (
                            <Alert status="success">
                                <AlertIcon />
                                <VStack align="start" spacing={1}>
                                    <Text fontWeight="medium">✅ Mapping Complete!</Text>
                                    <Text fontSize="sm">
                                        {selectedDatasets.length} datasets selected, {dataElementGroups.length} element groups mapped
                                    </Text>
                                </VStack>
                            </Alert>
                        )}
                    </VStack>
                )

            case 3:
                return (
                    <VStack spacing={4} align="stretch">
                        <Text fontSize="lg" fontWeight="medium">Review Configuration</Text>
                        <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
                            <VStack align="start" spacing={3}>
                                <HStack>
                                    <Text fontWeight="medium">Name:</Text>
                                    <Text>{configName}</Text>
                                </HStack>
                                
                                {configDescription && (
                                    <HStack align="start">
                                        <Text fontWeight="medium">Description:</Text>
                                        <Text>{configDescription}</Text>
                                    </HStack>
                                )}
                                
                                <HStack>
                                    <Text fontWeight="medium">DHIS2 URL:</Text>
                                    <Text>{destinationUrl}</Text>
                                </HStack>
                                
                                <HStack>
                                    <Text fontWeight="medium">Username:</Text>
                                    <Text>{destinationUser}</Text>
                                </HStack>
                                
                                <HStack>
                                    <Text fontWeight="medium">Datasets:</Text>
                                    <Badge colorScheme="blue">{selectedDatasets.length} selected</Badge>
                                </HStack>
                                
                                <HStack>
                                    <Text fontWeight="medium">Element Groups:</Text>
                                    <Badge colorScheme="green">{dataElementGroups.length} mapped</Badge>
                                </HStack>
                            </VStack>
                        </Box>
                        
                        <Alert status="success">
                            <AlertIcon />
                            <Text fontSize="sm">
                                Configuration is ready to be saved! Click "Save Configuration" to create it.
                            </Text>
                        </Alert>
                    </VStack>
                )

            default:
                return null
        }
    }

    return (
        <>
            <Modal isOpen={isOpen} onClose={handleClose} size="2xl" closeOnOverlayClick={false}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Create New Configuration</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={6} align="stretch">
                            {/* Progress Stepper */}
                            <Stepper size="sm" index={activeStep}>
                                {steps.map((step, index) => (
                                    <Step key={index}>
                                        <StepIndicator>
                                            <StepStatus
                                                complete={<StepIcon />}
                                                incomplete={<StepNumber />}
                                                active={<StepNumber />}
                                            />
                                        </StepIndicator>
                                        <Box flexShrink="0">
                                            <StepTitle>{step.title}</StepTitle>
                                            <StepDescription>{step.description}</StepDescription>
                                        </Box>
                                        <StepSeparator />
                                    </Step>
                                ))}
                            </Stepper>

                            {/* Step Content */}
                            {renderStepContent()}
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <HStack spacing={4}>
                            <Button
                                variant="ghost"
                                onClick={handleClose}
                            >
                                Cancel
                            </Button>
                            
                            {activeStep > 0 && (
                                <Button
                                    leftIcon={<FaArrowLeft />}
                                    onClick={handleBack}
                                >
                                    Back
                                </Button>
                            )}
                            
                            {activeStep < steps.length - 1 ? (
                                <Button
                                    colorScheme="purple"
                                    rightIcon={<FaArrowRight />}
                                    onClick={handleNext}
                                    isDisabled={!isStepValid()}
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button
                                    colorScheme="green"
                                    leftIcon={<FaSave />}
                                    onClick={handleSaveConfiguration}
                                >
                                    Save Configuration
                                </Button>
                            )}
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Dataset Mapping Modal */}
            {showComparisonModal && (
                <DataComparisonModal
                    isOpen={showComparisonModal}
                    onClose={() => setShowComparisonModal(false)}
                    sourceUrl={destinationUrl}
                    sourceUser={destinationUser}
                    sourcePass={destinationPass}
                    selectedSourceDataset=""
                    selectedSourceOrgUnits={[]}
                    selectedSourceOrgNames={[]}
                    selectedDataElements={[]}
                    destinationUrl={destinationUrl}
                    destinationUser={destinationUser}
                    destinationPass={destinationPass}
                    destinationOrgUnit="ImspTQPwCqd"
                    targetDatasetId=""
                    selectedDestOrgUnits={[]}
                    selectedDestOrgNames={[]}
                    dataElementMapping=""
                    period="202501"
                    onConfigurationComplete={(datasets: string[], groups: any[]) => {
                        handleComparisonComplete(datasets, groups)
                    }}
                />
            )}
        </>
    )
}