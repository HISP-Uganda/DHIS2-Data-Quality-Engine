import React, { useState } from 'react'
import {
    Box, VStack, HStack, Text, Button, Card, CardBody, Badge, Alert, AlertIcon,
    Table, Thead, Tbody, Tr, Th, Td, Input, FormControl, FormLabel, Switch,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter,
    ModalCloseButton, useToast, Spinner, Icon, Tabs, TabList, TabPanels,
    Tab, TabPanel, IconButton, Tooltip, useDisclosure, Flex, Select
} from '@chakra-ui/react'
import { FaPlus, FaEdit, FaSms, FaPhone, FaEnvelope, FaCheck, FaTimes, FaPaperPlane } from 'react-icons/fa'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Facility {
    id: string
    dhis2_org_unit_id: string
    name: string
    level?: number
    phone?: string
    email?: string
    whatsapp?: string
    notify_sms: boolean
    notify_email: boolean
    notify_whatsapp: boolean
    created_at: string
    updated_at: string
}

const API_BASE = import.meta.env.VITE_DQ_ENGINE_URL || 'https://engine.dqas.hispuganda.org'

export default function FacilityManagement() {
    const toast = useToast()
    const queryClient = useQueryClient()
    const { isOpen, onOpen, onClose } = useDisclosure()
    const { isOpen: isTestOpen, onOpen: onTestOpen, onClose: onTestClose } = useDisclosure()

    const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null)
    const [formData, setFormData] = useState({
        dhis2_org_unit_id: '',
        name: '',
        phone: '',
        email: '',
        whatsapp: '',
        notify_sms: false,
        notify_email: false,
        notify_whatsapp: false
    })

    const [testData, setTestData] = useState({
        phone: '',
        provider: 'dhis2' as 'dhis2' | 'dmark'
    })

    // Fetch facilities
    const { data: facilities = [], isLoading } = useQuery({
        queryKey: ['facilities'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/api/facilities`)
            if (!response.ok) throw new Error('Failed to fetch facilities')
            return await response.json()
        }
    })

    // Fetch SMS queue
    const { data: smsQueue } = useQuery({
        queryKey: ['sms-queue'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/api/sms/queue`)
            if (!response.ok) throw new Error('Failed to fetch SMS queue')
            return await response.json()
        },
        refetchInterval: 10000 // Refresh every 10 seconds
    })

    // Add/Update facility mutation
    const saveFacilityMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await fetch(`${API_BASE}/api/facilities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            if (!response.ok) throw new Error('Failed to save facility')
            return await response.json()
        },
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'Facility saved successfully',
                status: 'success',
                duration: 3000
            })
            queryClient.invalidateQueries({ queryKey: ['facilities'] })
            handleCloseModal()
        },
        onError: (error: Error) => {
            toast({
                title: 'Error',
                description: error.message,
                status: 'error',
                duration: 4000
            })
        }
    })

    // Update SMS settings mutation
    const updateSMSMutation = useMutation({
        mutationFn: async ({ id, ...data }: { id: string; phone?: string; notify_sms?: boolean }) => {
            const response = await fetch(`${API_BASE}/api/facilities/${id}/sms`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })
            if (!response.ok) throw new Error('Failed to update SMS settings')
            return await response.json()
        },
        onSuccess: () => {
            toast({
                title: 'Success',
                description: 'SMS settings updated',
                status: 'success',
                duration: 2000
            })
            queryClient.invalidateQueries({ queryKey: ['facilities'] })
        }
    })

    // Test SMS mutation
    const testSMSMutation = useMutation({
        mutationFn: async (data: typeof testData) => {
            const response = await fetch(`${API_BASE}/api/sms/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ testPhone: data.phone })
            })
            if (!response.ok) throw new Error('Failed to send test SMS')
            return await response.json()
        },
        onSuccess: (data) => {
            toast({
                title: 'Test SMS Sent',
                description: `DHIS2: ${data.results.dhis2.success ? '✓' : '✗'}, D-Mark: ${data.results.dmark.success ? '✓' : '✗'}`,
                status: data.results.dhis2.success || data.results.dmark.success ? 'success' : 'error',
                duration: 5000
            })
            onTestClose()
        },
        onError: (error: Error) => {
            toast({
                title: 'Test Failed',
                description: error.message,
                status: 'error',
                duration: 4000
            })
        }
    })

    const handleOpenModal = (facility?: Facility) => {
        if (facility) {
            setSelectedFacility(facility)
            setFormData({
                dhis2_org_unit_id: facility.dhis2_org_unit_id,
                name: facility.name,
                phone: facility.phone || '',
                email: facility.email || '',
                whatsapp: facility.whatsapp || '',
                notify_sms: facility.notify_sms,
                notify_email: facility.notify_email,
                notify_whatsapp: facility.notify_whatsapp
            })
        } else {
            setSelectedFacility(null)
            setFormData({
                dhis2_org_unit_id: '',
                name: '',
                phone: '',
                email: '',
                whatsapp: '',
                notify_sms: false,
                notify_email: false,
                notify_whatsapp: false
            })
        }
        onOpen()
    }

    const handleCloseModal = () => {
        setSelectedFacility(null)
        onClose()
    }

    const handleSave = () => {
        saveFacilityMutation.mutate(formData)
    }

    const toggleSMSNotification = (facility: Facility) => {
        updateSMSMutation.mutate({
            id: facility.dhis2_org_unit_id,
            notify_sms: !facility.notify_sms
        })
    }

    return (
        <Box p={6}>
            <VStack spacing={6} align="stretch">
                {/* Header */}
                <Flex justify="space-between" align="center">
                    <VStack align="start" spacing={1}>
                        <Text fontSize="2xl" fontWeight="bold">Facility SMS Management</Text>
                        <Text fontSize="sm" color="gray.600">
                            Manage facility contacts and SMS notification preferences
                        </Text>
                    </VStack>
                    <HStack spacing={3}>
                        <Button
                            leftIcon={<FaPaperPlane />}
                            colorScheme="purple"
                            size="sm"
                            onClick={onTestOpen}
                        >
                            Test SMS
                        </Button>
                        <Button
                            leftIcon={<FaPlus />}
                            colorScheme="blue"
                            onClick={() => handleOpenModal()}
                        >
                            Add Facility
                        </Button>
                    </HStack>
                </Flex>

                <Tabs colorScheme="blue">
                    <TabList>
                        <Tab>
                            <HStack spacing={2}>
                                <Icon as={FaPhone} />
                                <Text>Facilities ({facilities.length})</Text>
                            </HStack>
                        </Tab>
                        <Tab>
                            <HStack spacing={2}>
                                <Icon as={FaSms} />
                                <Text>SMS Queue ({smsQueue?.queue?.length || 0})</Text>
                            </HStack>
                        </Tab>
                    </TabList>

                    <TabPanels>
                        {/* Facilities Tab */}
                        <TabPanel>
                            <Card>
                                <CardBody>
                                    {isLoading ? (
                                        <Flex justify="center" py={8}>
                                            <Spinner />
                                        </Flex>
                                    ) : facilities.length === 0 ? (
                                        <Alert status="info">
                                            <AlertIcon />
                                            No facilities configured. Click "Add Facility" to get started.
                                        </Alert>
                                    ) : (
                                        <Table variant="simple" size="sm">
                                            <Thead>
                                                <Tr>
                                                    <Th>Facility Name</Th>
                                                    <Th>Phone</Th>
                                                    <Th>Email</Th>
                                                    <Th>WhatsApp</Th>
                                                    <Th>SMS Alerts</Th>
                                                    <Th>Actions</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {facilities.map((facility: Facility) => (
                                                    <Tr key={facility.id}>
                                                        <Td>
                                                            <VStack align="start" spacing={0}>
                                                                <Text fontWeight="medium">{facility.name}</Text>
                                                                <Text fontSize="xs" color="gray.500">
                                                                    {facility.dhis2_org_unit_id}
                                                                </Text>
                                                            </VStack>
                                                        </Td>
                                                        <Td>
                                                            {facility.phone ? (
                                                                <HStack spacing={1}>
                                                                    <Icon as={FaPhone} color="green.500" boxSize={3} />
                                                                    <Text fontSize="sm">{facility.phone}</Text>
                                                                </HStack>
                                                            ) : (
                                                                <Text fontSize="sm" color="gray.400">—</Text>
                                                            )}
                                                        </Td>
                                                        <Td>
                                                            {facility.email ? (
                                                                <Text fontSize="sm">{facility.email}</Text>
                                                            ) : (
                                                                <Text fontSize="sm" color="gray.400">—</Text>
                                                            )}
                                                        </Td>
                                                        <Td>
                                                            {facility.whatsapp ? (
                                                                <Text fontSize="sm">{facility.whatsapp}</Text>
                                                            ) : (
                                                                <Text fontSize="sm" color="gray.400">—</Text>
                                                            )}
                                                        </Td>
                                                        <Td>
                                                            <Switch
                                                                size="sm"
                                                                isChecked={facility.notify_sms}
                                                                onChange={() => toggleSMSNotification(facility)}
                                                                isDisabled={!facility.phone || updateSMSMutation.isPending}
                                                                colorScheme="green"
                                                            />
                                                        </Td>
                                                        <Td>
                                                            <Tooltip label="Edit facility">
                                                                <IconButton
                                                                    aria-label="Edit"
                                                                    icon={<FaEdit />}
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => handleOpenModal(facility)}
                                                                />
                                                            </Tooltip>
                                                        </Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    )}
                                </CardBody>
                            </Card>
                        </TabPanel>

                        {/* SMS Queue Tab */}
                        <TabPanel>
                            <VStack spacing={4} align="stretch">
                                {/* Queue Stats */}
                                {smsQueue?.stats && (
                                    <HStack spacing={4}>
                                        {smsQueue.stats.map((stat: any) => (
                                            <Card key={stat.status} flex="1">
                                                <CardBody>
                                                    <VStack spacing={1}>
                                                        <Text fontSize="2xl" fontWeight="bold">
                                                            {stat.count}
                                                        </Text>
                                                        <Badge
                                                            colorScheme={
                                                                stat.status === 'sent' ? 'green' :
                                                                stat.status === 'failed' ? 'red' : 'yellow'
                                                            }
                                                        >
                                                            {stat.status}
                                                        </Badge>
                                                    </VStack>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </HStack>
                                )}

                                {/* Queue Messages */}
                                <Card>
                                    <CardBody>
                                        {!smsQueue?.queue || smsQueue.queue.length === 0 ? (
                                            <Alert status="info">
                                                <AlertIcon />
                                                No SMS messages in queue
                                            </Alert>
                                        ) : (
                                            <Table variant="simple" size="sm">
                                                <Thead>
                                                    <Tr>
                                                        <Th>Status</Th>
                                                        <Th>Recipient</Th>
                                                        <Th>Message</Th>
                                                        <Th>Created</Th>
                                                        <Th>Attempts</Th>
                                                    </Tr>
                                                </Thead>
                                                <Tbody>
                                                    {smsQueue.queue.map((item: any) => (
                                                        <Tr key={item.id}>
                                                            <Td>
                                                                <Badge
                                                                    colorScheme={
                                                                        item.status === 'sent' ? 'green' :
                                                                        item.status === 'failed' ? 'red' : 'yellow'
                                                                    }
                                                                >
                                                                    {item.status}
                                                                </Badge>
                                                            </Td>
                                                            <Td>{item.recipient}</Td>
                                                            <Td>
                                                                <Text fontSize="xs" noOfLines={2}>
                                                                    {item.message}
                                                                </Text>
                                                            </Td>
                                                            <Td>
                                                                <Text fontSize="xs">
                                                                    {new Date(item.created_at).toLocaleString()}
                                                                </Text>
                                                            </Td>
                                                            <Td>
                                                                {item.attempts}/{item.max_attempts}
                                                            </Td>
                                                        </Tr>
                                                    ))}
                                                </Tbody>
                                            </Table>
                                        )}
                                    </CardBody>
                                </Card>
                            </VStack>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </VStack>

            {/* Add/Edit Facility Modal */}
            <Modal isOpen={isOpen} onClose={handleCloseModal} size="lg">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        {selectedFacility ? 'Edit Facility' : 'Add New Facility'}
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>DHIS2 Org Unit ID</FormLabel>
                                <Input
                                    value={formData.dhis2_org_unit_id}
                                    onChange={(e) => setFormData({ ...formData, dhis2_org_unit_id: e.target.value })}
                                    placeholder="e.g., ImspTQPwCqd"
                                />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Facility Name</FormLabel>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Kakira Health Center"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>Phone Number</FormLabel>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="256771234567"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>Email</FormLabel>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="facility@example.com"
                                />
                            </FormControl>

                            <FormControl>
                                <FormLabel>WhatsApp</FormLabel>
                                <Input
                                    value={formData.whatsapp}
                                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                                    placeholder="256771234567"
                                />
                            </FormControl>

                            <FormControl display="flex" alignItems="center">
                                <FormLabel mb="0">Enable SMS Notifications</FormLabel>
                                <Switch
                                    isChecked={formData.notify_sms}
                                    onChange={(e) => setFormData({ ...formData, notify_sms: e.target.checked })}
                                    colorScheme="green"
                                />
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="blue"
                            onClick={handleSave}
                            isLoading={saveFacilityMutation.isPending}
                        >
                            Save
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            {/* Test SMS Modal */}
            <Modal isOpen={isTestOpen} onClose={onTestClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Test SMS Configuration</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={4}>
                            <Alert status="info" fontSize="sm">
                                <AlertIcon />
                                This will send a test SMS to verify your DHIS2 and D-Mark configurations.
                            </Alert>

                            <FormControl isRequired>
                                <FormLabel>Test Phone Number</FormLabel>
                                <Input
                                    value={testData.phone}
                                    onChange={(e) => setTestData({ ...testData, phone: e.target.value })}
                                    placeholder="256771234567"
                                />
                            </FormControl>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onTestClose}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="purple"
                            leftIcon={<FaPaperPlane />}
                            onClick={() => testSMSMutation.mutate(testData)}
                            isLoading={testSMSMutation.isPending}
                            isDisabled={!testData.phone}
                        >
                            Send Test SMS
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    )
}
