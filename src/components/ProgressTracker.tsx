import React from 'react'
import {
    Box,
    Progress,
    Text,
    VStack,
    HStack,
    Icon,
    Alert,
    AlertIcon,
    CloseButton,
    Fade,
} from '@chakra-ui/react'
import { FaCheckCircle, FaExclamationCircle, FaSpinner } from 'react-icons/fa'

export interface ProgressStep {
    label: string
    progress: number // 0-100
    status: 'pending' | 'active' | 'completed' | 'error'
}

interface ProgressTrackerProps {
    steps: ProgressStep[]
    currentStep: number
    overallProgress: number
    isVisible: boolean
    onClose?: () => void
    title?: string
    error?: string
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
    steps,
    currentStep,
    overallProgress,
    isVisible,
    onClose,
    title = 'Processing...',
    error,
}) => {
    if (!isVisible) return null

    const isComplete = currentStep >= steps.length && !error
    const hasError = !!error

    return (
        <Fade in={isVisible}>
            <Box
                position="fixed"
                bottom={4}
                right={4}
                maxW="500px"
                w="full"
                bg="white"
                boxShadow="xl"
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.200"
                p={4}
                zIndex={9999}
            >
                <VStack spacing={3} align="stretch">
                    {/* Header */}
                    <HStack justify="space-between" align="center">
                        <HStack spacing={2}>
                            {!isComplete && !hasError && (
                                <Icon as={FaSpinner} color="blue.500" boxSize={4} className="spin" />
                            )}
                            {isComplete && (
                                <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                            )}
                            {hasError && (
                                <Icon as={FaExclamationCircle} color="red.500" boxSize={4} />
                            )}
                            <Text fontWeight="bold" fontSize="sm">
                                {hasError ? 'Error' : isComplete ? 'Complete' : title}
                            </Text>
                        </HStack>
                        {onClose && (isComplete || hasError) && (
                            <CloseButton size="sm" onClick={onClose} />
                        )}
                    </HStack>

                    {/* Error Message */}
                    {hasError && (
                        <Alert status="error" size="sm" borderRadius="md">
                            <AlertIcon />
                            <Text fontSize="xs">{error}</Text>
                        </Alert>
                    )}

                    {/* Overall Progress Bar */}
                    {!hasError && (
                        <Box>
                            <Progress
                                value={overallProgress}
                                size="sm"
                                colorScheme={isComplete ? 'green' : 'blue'}
                                borderRadius="full"
                                hasStripe
                                isAnimated={!isComplete}
                            />
                            <Text fontSize="xs" color="gray.600" mt={1}>
                                {Math.round(overallProgress)}% Complete
                            </Text>
                        </Box>
                    )}

                    {/* Step Details */}
                    {!hasError && steps.length > 0 && (
                        <VStack spacing={2} align="stretch" maxH="200px" overflowY="auto">
                            {steps.map((step, index) => (
                                <HStack
                                    key={index}
                                    spacing={2}
                                    p={2}
                                    bg={index === currentStep ? 'blue.50' : 'transparent'}
                                    borderRadius="md"
                                    opacity={step.status === 'pending' ? 0.5 : 1}
                                >
                                    {step.status === 'completed' && (
                                        <Icon as={FaCheckCircle} color="green.500" boxSize={3} />
                                    )}
                                    {step.status === 'active' && (
                                        <Icon as={FaSpinner} color="blue.500" boxSize={3} className="spin" />
                                    )}
                                    {step.status === 'error' && (
                                        <Icon as={FaExclamationCircle} color="red.500" boxSize={3} />
                                    )}
                                    {step.status === 'pending' && (
                                        <Box w={3} h={3} borderRadius="full" bg="gray.300" />
                                    )}
                                    <Text fontSize="xs" flex={1} fontWeight={index === currentStep ? 'semibold' : 'normal'}>
                                        {step.label}
                                    </Text>
                                    {step.status === 'active' && step.progress > 0 && (
                                        <Text fontSize="xs" color="gray.600">
                                            {Math.round(step.progress)}%
                                        </Text>
                                    )}
                                </HStack>
                            ))}
                        </VStack>
                    )}

                    {/* Success Message */}
                    {isComplete && (
                        <Alert status="success" size="sm" borderRadius="md">
                            <AlertIcon />
                            <Text fontSize="xs">All steps completed successfully!</Text>
                        </Alert>
                    )}
                </VStack>

                {/* CSS for spinner animation */}
                <style>{`
                    .spin {
                        animation: spin 1s linear infinite;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </Box>
        </Fade>
    )
}

export default ProgressTracker
