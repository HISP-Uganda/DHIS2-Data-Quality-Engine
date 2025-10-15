import React, { useState } from 'react'
import {
    Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, VStack, HStack, Text, Badge, Box, Icon, Tooltip,
    Table, Thead, Tbody, Tr, Th, Td, useDisclosure, Progress, Alert, AlertIcon
} from '@chakra-ui/react'
import { FaMagic, FaCheck, FaExclamationTriangle, FaQuestionCircle } from 'react-icons/fa'
import { generateAutoMappings, type DataElement, type MappingSuggestion } from '../utils/dataElementMapping'

interface AutoMappingButtonProps {
    sourceElements: DataElement[]
    targetElements: DataElement[]
    onMappingGenerated: (mapping: Record<string, string>) => void
    isDisabled?: boolean
}

// Confidence badge colors
const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    const config = {
        high: { colorScheme: 'green', label: 'HIGH', icon: FaCheck },
        medium: { colorScheme: 'yellow', label: 'MEDIUM', icon: FaExclamationTriangle },
        low: { colorScheme: 'orange', label: 'LOW', icon: FaQuestionCircle }
    }
    return config[confidence]
}

export default function AutoMappingButton({
    sourceElements,
    targetElements,
    onMappingGenerated,
    isDisabled = false
}: AutoMappingButtonProps) {
    const { isOpen, onOpen, onClose } = useDisclosure()
    const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([])
    const [selectedMappings, setSelectedMappings] = useState<Set<string>>(new Set())
    const [isGenerating, setIsGenerating] = useState(false)

    const handleGenerateMappings = async () => {
        setIsGenerating(true)

        // Simulate async processing for better UX
        await new Promise(resolve => setTimeout(resolve, 500))

        const result = generateAutoMappings(sourceElements, targetElements, 0.30)
        setSuggestions(result)

        // Pre-select high and medium confidence mappings
        const preSelected = new Set<string>()
        result.forEach(suggestion => {
            if (suggestion.confidence === 'high' || suggestion.confidence === 'medium') {
                preSelected.add(suggestion.sourceElement.id)
            }
        })
        setSelectedMappings(preSelected)

        setIsGenerating(false)
        onOpen()
    }

    const handleApplyMappings = () => {
        const mapping: Record<string, string> = {}

        suggestions.forEach(suggestion => {
            if (selectedMappings.has(suggestion.sourceElement.id)) {
                mapping[suggestion.sourceElement.id] = suggestion.targetElement.id
            }
        })

        onMappingGenerated(mapping)
        onClose()
    }

    const toggleMapping = (sourceId: string) => {
        const newSelected = new Set(selectedMappings)
        if (newSelected.has(sourceId)) {
            newSelected.delete(sourceId)
        } else {
            newSelected.add(sourceId)
        }
        setSelectedMappings(newSelected)
    }

    const highCount = suggestions.filter(s => s.confidence === 'high').length
    const mediumCount = suggestions.filter(s => s.confidence === 'medium').length
    const lowCount = suggestions.filter(s => s.confidence === 'low').length
    const selectedCount = selectedMappings.size

    return (
        <>
            <Tooltip label="Automatically suggest mappings based on name similarity">
                <Button
                    size="sm"
                    leftIcon={<Icon as={FaMagic} />}
                    colorScheme="purple"
                    variant="outline"
                    onClick={handleGenerateMappings}
                    isDisabled={isDisabled || sourceElements.length === 0 || targetElements.length === 0}
                    isLoading={isGenerating}
                >
                    Auto-Map
                </Button>
            </Tooltip>

            <Modal isOpen={isOpen} onClose={onClose} size="6xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        <HStack>
                            <Icon as={FaMagic} color="purple.500" />
                            <Text>Intelligent Data Element Mapping</Text>
                        </HStack>
                    </ModalHeader>
                    <ModalCloseButton />

                    <ModalBody>
                        <VStack spacing={4} align="stretch">
                            {/* Summary Stats */}
                            <Box p={3} bg="purple.50" borderRadius="md" border="1px" borderColor="purple.200">
                                <Text fontSize="sm" fontWeight="bold" mb={2}>Mapping Summary</Text>
                                <HStack spacing={4} fontSize="sm">
                                    <HStack>
                                        <Badge colorScheme="green">{highCount}</Badge>
                                        <Text>High Confidence</Text>
                                    </HStack>
                                    <HStack>
                                        <Badge colorScheme="yellow">{mediumCount}</Badge>
                                        <Text>Medium Confidence</Text>
                                    </HStack>
                                    <HStack>
                                        <Badge colorScheme="orange">{lowCount}</Badge>
                                        <Text>Low Confidence</Text>
                                    </HStack>
                                    <Box flex={1} />
                                    <HStack>
                                        <Badge colorScheme="blue" fontSize="md">{selectedCount}/{suggestions.length}</Badge>
                                        <Text fontWeight="bold">Selected</Text>
                                    </HStack>
                                </HStack>
                            </Box>

                            {/* Help Text */}
                            <Alert status="info" size="sm">
                                <AlertIcon />
                                <Text fontSize="xs">
                                    Review suggested mappings below. High confidence mappings are pre-selected.
                                    Uncheck any incorrect mappings before applying.
                                </Text>
                            </Alert>

                            {/* Suggestions Table */}
                            {suggestions.length === 0 ? (
                                <Box p={6} textAlign="center">
                                    <Text color="gray.500">No similar data elements found.</Text>
                                    <Text fontSize="xs" color="gray.400" mt={1}>
                                        Try adjusting your selection or map manually.
                                    </Text>
                                </Box>
                            ) : (
                                <Box maxH="400px" overflowY="auto" border="1px" borderColor="gray.200" borderRadius="md">
                                    <Table size="sm" variant="simple">
                                        <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
                                            <Tr>
                                                <Th width="40px">Select</Th>
                                                <Th>Source Element</Th>
                                                <Th>Target Element</Th>
                                                <Th width="120px">Confidence</Th>
                                                <Th width="80px">Score</Th>
                                                <Th>Reason</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {suggestions.map((suggestion) => {
                                                const badge = getConfidenceBadge(suggestion.confidence)
                                                const isSelected = selectedMappings.has(suggestion.sourceElement.id)

                                                return (
                                                    <Tr
                                                        key={suggestion.sourceElement.id}
                                                        bg={isSelected ? 'blue.50' : 'white'}
                                                        _hover={{ bg: isSelected ? 'blue.100' : 'gray.50' }}
                                                        cursor="pointer"
                                                        onClick={() => toggleMapping(suggestion.sourceElement.id)}
                                                    >
                                                        <Td>
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleMapping(suggestion.sourceElement.id)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        </Td>
                                                        <Td>
                                                            <Text fontSize="xs" fontWeight="medium">
                                                                {suggestion.sourceElement.displayName}
                                                            </Text>
                                                        </Td>
                                                        <Td>
                                                            <Text fontSize="xs" fontWeight="medium">
                                                                {suggestion.targetElement.displayName}
                                                            </Text>
                                                        </Td>
                                                        <Td>
                                                            <Badge
                                                                colorScheme={badge.colorScheme}
                                                                fontSize="10px"
                                                                px={2}
                                                            >
                                                                <HStack spacing={1}>
                                                                    <Icon as={badge.icon} boxSize={2} />
                                                                    <Text>{badge.label}</Text>
                                                                </HStack>
                                                            </Badge>
                                                        </Td>
                                                        <Td>
                                                            <Tooltip label={`
                                                                Overall: ${(suggestion.similarity.overall * 100).toFixed(0)}%
                                                                Term Overlap: ${(suggestion.similarity.termOverlap * 100).toFixed(0)}%
                                                                Containment: ${(suggestion.similarity.containment * 100).toFixed(0)}%
                                                            `}>
                                                                <HStack spacing={1}>
                                                                    <Text fontSize="xs" fontWeight="bold">
                                                                        {(suggestion.similarity.overall * 100).toFixed(0)}%
                                                                    </Text>
                                                                    <Progress
                                                                        value={suggestion.similarity.overall * 100}
                                                                        size="xs"
                                                                        colorScheme={
                                                                            suggestion.confidence === 'high' ? 'green' :
                                                                            suggestion.confidence === 'medium' ? 'yellow' : 'orange'
                                                                        }
                                                                        width="30px"
                                                                    />
                                                                </HStack>
                                                            </Tooltip>
                                                        </Td>
                                                        <Td>
                                                            <Text fontSize="xs" color="gray.600" isTruncated maxW="200px">
                                                                {suggestion.reasons[0]}
                                                            </Text>
                                                        </Td>
                                                    </Tr>
                                                )
                                            })}
                                        </Tbody>
                                    </Table>
                                </Box>
                            )}

                            {/* Unmapped Elements Warning */}
                            {sourceElements.length > suggestions.length && (
                                <Alert status="warning" size="sm">
                                    <AlertIcon />
                                    <Text fontSize="xs">
                                        {sourceElements.length - suggestions.length} source element(s) could not be auto-matched.
                                        You'll need to map these manually.
                                    </Text>
                                </Alert>
                            )}
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <HStack spacing={2}>
                            <Button variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                colorScheme="purple"
                                onClick={handleApplyMappings}
                                isDisabled={selectedCount === 0}
                            >
                                Apply {selectedCount} Mapping{selectedCount !== 1 ? 's' : ''}
                            </Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}
