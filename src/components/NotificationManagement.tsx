import React, { useState, useEffect } from 'react'
import {
    Box, Heading, VStack, HStack, FormControl, FormLabel, Input, Button,
    Table, Thead, Tbody, Tr, Th, Td, useToast, Text, SimpleGrid,
    Divider, Badge, Select, Textarea, Checkbox, IconButton,
    Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter,
    ModalBody, ModalCloseButton, useDisclosure, Flex, Spacer,
    Alert, AlertIcon, AlertTitle, AlertDescription, Switch
} from '@chakra-ui/react'
import { FaPlus, FaEdit, FaTrash, FaBell, FaEnvelope, FaWhatsapp, FaPaperPlane } from 'react-icons/fa'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import DQOrgUnitPicker from './DQOrgUnitPicker'
import type { OrgUnitTreeNode } from '../api'

// Types
interface FacilityContact {
    id: string
    name: string
    orgUnitId: string
    email: string[]
    whatsapp: string[]
    sms: string[]
    enabled: boolean
    notificationPreferences: {
        dqRuns: boolean
        comparisons: boolean
        emailEnabled: boolean
        whatsappEnabled: boolean
        smsEnabled: boolean
    }
    createdAt: string
    updatedAt: string
}

interface NotificationConfig {
    email: {
        host: string
        port: number
        secure: boolean
        user: string
        pass: string
        from: string
    }
    whatsapp: {
        accountSid: string
        authToken: string
        fromNumber: string
    }
    sms: {
        accountSid: string
        authToken: string
        fromNumber: string
    }
}

interface ServiceStatus {
    email: { configured: boolean; connected: boolean }
    whatsapp: { configured: boolean; connected: boolean }
    sms: { configured: boolean; connected: boolean }
}

// API functions
const API_BASE = import.meta.env.VITE_DQ_ENGINE_URL || 'https://engine.dqas.hispuganda.org'

const fetchFacilities = async (): Promise<FacilityContact[]> => {
    const response = await fetch(`${API_BASE}/api/facilities`)
    if (!response.ok) throw new Error('Failed to fetch facilities')
    return response.json()
}

const createFacility = async (facility: Omit<FacilityContact, 'id' | 'createdAt' | 'updatedAt'>): Promise<FacilityContact> => {
    const response = await fetch(`${API_BASE}/api/facilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(facility)
    })
    if (!response.ok) throw new Error('Failed to create facility')
    return response.json()
}

const updateFacility = async ({ id, ...updates }: Partial<FacilityContact> & { id: string }): Promise<FacilityContact> => {
    const response = await fetch(`${API_BASE}/api/facilities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error('Failed to update facility')
    return response.json()
}

const deleteFacility = async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/facilities/${id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete facility')
}

const configureEmail = async (config: NotificationConfig['email']): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/notifications/configure-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    })
    if (!response.ok) throw new Error('Failed to configure email')
}

const configureWhatsApp = async (config: NotificationConfig['whatsapp']): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/notifications/configure-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    })
    if (!response.ok) throw new Error('Failed to configure WhatsApp')
}

const configureSMS = async (config: NotificationConfig['sms']): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/notifications/configure-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
    })
    if (!response.ok) throw new Error('Failed to configure SMS')
}

const testServices = async (): Promise<ServiceStatus> => {
    const response = await fetch(`${API_BASE}/api/notifications/test-services`)
    if (!response.ok) throw new Error('Failed to test services')
    return response.json()
}

const testDQNotification = async (orgUnitId: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/notifications/test-dq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgUnitId })
    })
    if (!response.ok) throw new Error('Failed to send test notification')
    return response.json()
}

const fetchOrgUnitTree = async (): Promise<OrgUnitTreeNode[]> => {
    const response = await fetch(`${API_BASE}/api/org-units/tree`)
    if (!response.ok) throw new Error('Failed to fetch org unit tree')
    return response.json()
}

export default function NotificationManagement() {
    const toast = useToast()
    const queryClient = useQueryClient()
    const { isOpen: isFacilityModalOpen, onOpen: onFacilityModalOpen, onClose: onFacilityModalClose } = useDisclosure()
    const { isOpen: isConfigModalOpen, onOpen: onConfigModalOpen, onClose: onConfigModalClose } = useDisclosure()

    // Form states
    const [editingFacility, setEditingFacility] = useState<FacilityContact | null>(null)
    const [facilityForm, setFacilityForm] = useState({
        name: '',
        orgUnitId: '',
        orgUnitName: '',
        email: '',
        whatsapp: '',
        sms: '',
        enabled: true,
        notificationPreferences: {
            dqRuns: true,
            comparisons: true,
            emailEnabled: true,
            whatsappEnabled: true,
            smsEnabled: true
        }
    })

    const [emailConfig, setEmailConfig] = useState({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: '',
        pass: '',
        from: ''
    })

    const [whatsappConfig, setWhatsappConfig] = useState({
        accountSid: '',
        authToken: '',
        fromNumber: ''
    })

    const [smsConfig, setSmsConfig] = useState({
        accountSid: '',
        authToken: '',
        fromNumber: ''
    })

    // Queries
    const { data: facilities = [], isLoading: facilitiesLoading } = useQuery({
        queryKey: ['facilities'],
        queryFn: fetchFacilities
    })

    const { data: serviceStatus, isLoading: statusLoading } = useQuery({
        queryKey: ['service-status'],
        queryFn: testServices,
        refetchInterval: 30000 // Refresh every 30 seconds
    })

    const { data: orgUnitTree = [], isLoading: orgUnitTreeLoading } = useQuery({
        queryKey: ['org-unit-tree'],
        queryFn: fetchOrgUnitTree
    })

    // Mutations
    const createFacilityMutation = useMutation({
        mutationFn: createFacility,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['facilities'] })
            toast({ status: 'success', title: 'Facility created successfully' })
            onFacilityModalClose()
            resetFacilityForm()
        },
        onError: (error: Error) => {
            toast({ status: 'error', title: 'Failed to create facility', description: error.message })
        }
    })

    const updateFacilityMutation = useMutation({
        mutationFn: updateFacility,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['facilities'] })
            toast({ status: 'success', title: 'Facility updated successfully' })
            onFacilityModalClose()
            resetFacilityForm()
        },
        onError: (error: Error) => {
            toast({ status: 'error', title: 'Failed to update facility', description: error.message })
        }
    })

    const deleteFacilityMutation = useMutation({
        mutationFn: deleteFacility,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['facilities'] })
            toast({ status: 'success', title: 'Facility deleted successfully' })
        },
        onError: (error: Error) => {
            toast({ status: 'error', title: 'Failed to delete facility', description: error.message })
        }
    })

    const configureEmailMutation = useMutation({
        mutationFn: configureEmail,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['service-status'] })
            toast({ status: 'success', title: 'Email configuration saved' })
            onConfigModalClose()
        },
        onError: (error: Error) => {
            toast({ status: 'error', title: 'Failed to configure email', description: error.message })
        }
    })

    const configureWhatsAppMutation = useMutation({
        mutationFn: configureWhatsApp,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['service-status'] })
            toast({ status: 'success', title: 'WhatsApp configuration saved' })
            onConfigModalClose()
        },
        onError: (error: Error) => {
            toast({ status: 'error', title: 'Failed to configure WhatsApp', description: error.message })
        }
    })

    const configureSMSMutation = useMutation({
        mutationFn: configureSMS,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['service-status'] })
            toast({ status: 'success', title: 'SMS configuration saved' })
            onConfigModalClose()
        },
        onError: (error: Error) => {
            toast({ status: 'error', title: 'Failed to configure SMS', description: error.message })
        }
    })

    const testNotificationMutation = useMutation({
        mutationFn: testDQNotification,
        onSuccess: (data: any) => {
            toast({ 
                status: 'success', 
                title: 'Test notification sent',
                description: `Sent to ${data.result?.facilitiesNotified?.length || 0} facilities`
            })
        },
        onError: (error: Error) => {
            toast({ status: 'error', title: 'Failed to send test notification', description: error.message })
        }
    })

    // Helper functions
    const resetFacilityForm = () => {
        setFacilityForm({
            name: '',
            orgUnitId: '',
            orgUnitName: '',
            email: '',
            whatsapp: '',
            sms: '',
            enabled: true,
            notificationPreferences: {
                dqRuns: true,
                comparisons: true,
                emailEnabled: true,
                whatsappEnabled: true,
                smsEnabled: true
            }
        })
        setEditingFacility(null)
    }

    const openEditModal = (facility: FacilityContact) => {
        setEditingFacility(facility)
        setFacilityForm({
            name: facility.name,
            orgUnitId: facility.orgUnitId,
            email: facility.email.join(', '),
            whatsapp: facility.whatsapp.join(', '),
            sms: (facility.sms || []).join(', '),
            enabled: facility.enabled,
            notificationPreferences: {
                ...facility.notificationPreferences,
                smsEnabled: facility.notificationPreferences.smsEnabled ?? true
            }
        })
        onFacilityModalOpen()
    }

    const handleFacilitySubmit = () => {
        const facilityData = {
            name: facilityForm.name,
            orgUnitId: facilityForm.orgUnitId,
            email: facilityForm.email.split(',').map(e => e.trim()).filter(e => e),
            whatsapp: facilityForm.whatsapp.split(',').map(w => w.trim()).filter(w => w),
            sms: facilityForm.sms.split(',').map(s => s.trim()).filter(s => s),
            enabled: facilityForm.enabled,
            notificationPreferences: facilityForm.notificationPreferences
        }

        if (editingFacility) {
            updateFacilityMutation.mutate({ id: editingFacility.id, ...facilityData })
        } else {
            createFacilityMutation.mutate(facilityData)
        }
    }

    const handleSendTestNotification = (orgUnitId: string) => {
        testNotificationMutation.mutate(orgUnitId)
    }

    return (
        <Box p={6}>
            <VStack spacing={6} align="stretch">
                {/* Header */}
                <Flex align="center">
                    <Heading size="lg" color="teal.700">
                        <FaBell style={{ display: 'inline', marginRight: '8px' }} />
                        Notification Management
                    </Heading>
                    <Spacer />
                    <HStack spacing={2}>
                        <Button 
                            leftIcon={<FaPlus />} 
                            colorScheme="teal" 
                            onClick={onFacilityModalOpen}
                        >
                            Add Facility
                        </Button>
                        <Button 
                            variant="outline" 
                            colorScheme="blue" 
                            onClick={onConfigModalOpen}
                        >
                            Configure Services
                        </Button>
                    </HStack>
                </Flex>

                {/* Service Status */}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                    <Box p={4} bg="blue.50" borderRadius="md" border="1px" borderColor="blue.200">
                        <HStack justify="space-between" mb={2}>
                            <HStack>
                                <FaEnvelope color="#3182CE" />
                                <Text fontWeight="semibold" color="blue.700">Email Service</Text>
                            </HStack>
                            <Badge colorScheme={serviceStatus?.email.connected ? 'green' : serviceStatus?.email.configured ? 'yellow' : 'red'}>
                                {serviceStatus?.email.connected ? 'Connected' : serviceStatus?.email.configured ? 'Configured' : 'Not Configured'}
                            </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                            {serviceStatus?.email.connected ? 'Ready to send emails' : 
                             serviceStatus?.email.configured ? 'Configured but connection failed' : 
                             'Configure SMTP settings to enable email notifications'}
                        </Text>
                    </Box>

                    <Box p={4} bg="green.50" borderRadius="md" border="1px" borderColor="green.200">
                        <HStack justify="space-between" mb={2}>
                            <HStack>
                                <FaWhatsapp color="#25D366" />
                                <Text fontWeight="semibold" color="green.700">WhatsApp Service</Text>
                            </HStack>
                            <Badge colorScheme={serviceStatus?.whatsapp.connected ? 'green' : serviceStatus?.whatsapp.configured ? 'yellow' : 'red'}>
                                {serviceStatus?.whatsapp.connected ? 'Connected' : serviceStatus?.whatsapp.configured ? 'Configured' : 'Not Configured'}
                            </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                            {serviceStatus?.whatsapp.connected ? 'Ready to send WhatsApp messages' : 
                             serviceStatus?.whatsapp.configured ? 'Configured but connection failed' : 
                             'Configure Twilio credentials to enable WhatsApp notifications'}
                        </Text>
                    </Box>

                    <Box p={4} bg="purple.50" borderRadius="md" border="1px" borderColor="purple.200">
                        <HStack justify="space-between" mb={2}>
                            <HStack>
                                <FaPaperPlane color="#805AD5" />
                                <Text fontWeight="semibold" color="purple.700">SMS Service</Text>
                            </HStack>
                            <Badge colorScheme={serviceStatus?.sms?.connected ? 'green' : serviceStatus?.sms?.configured ? 'yellow' : 'red'}>
                                {serviceStatus?.sms?.connected ? 'Connected' : serviceStatus?.sms?.configured ? 'Configured' : 'Not Configured'}
                            </Badge>
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                            {serviceStatus?.sms?.connected ? 'Ready to send SMS messages' : 
                             serviceStatus?.sms?.configured ? 'Configured but connection failed' : 
                             'Configure Twilio SMS credentials to enable SMS notifications'}
                        </Text>
                    </Box>
                </SimpleGrid>

                {/* Facilities Table */}
                <Box>
                    <Heading size="md" mb={4}>Facility Contacts</Heading>
                    {facilitiesLoading ? (
                        <Text>Loading facilities...</Text>
                    ) : facilities.length === 0 ? (
                        <Alert status="info">
                            <AlertIcon />
                            <AlertTitle>No facilities configured!</AlertTitle>
                            <AlertDescription>
                                Add facility contacts to start receiving data quality notifications.
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <Box overflowX="auto">
                            <Table variant="simple" size="sm">
                                <Thead>
                                    <Tr>
                                        <Th>Facility Name</Th>
                                        <Th>Org Unit ID</Th>
                                        <Th>Contacts</Th>
                                        <Th>Notifications</Th>
                                        <Th>Status</Th>
                                        <Th>Actions</Th>
                                    </Tr>
                                </Thead>
                                <Tbody>
                                    {facilities.map(facility => (
                                        <Tr key={facility.id}>
                                            <Td>
                                                <Text fontWeight="semibold">{facility.name}</Text>
                                            </Td>
                                            <Td>
                                                <Text fontSize="sm" fontFamily="mono">{facility.orgUnitId}</Text>
                                            </Td>
                                            <Td>
                                                <VStack align="start" spacing={1}>
                                                    {facility.email.length > 0 && (
                                                        <HStack spacing={1}>
                                                            <FaEnvelope size={12} color="#3182CE" />
                                                            <Text fontSize="xs">{facility.email.length} email(s)</Text>
                                                        </HStack>
                                                    )}
                                                    {facility.whatsapp.length > 0 && (
                                                        <HStack spacing={1}>
                                                            <FaWhatsapp size={12} color="#25D366" />
                                                            <Text fontSize="xs">{facility.whatsapp.length} WhatsApp(s)</Text>
                                                        </HStack>
                                                    )}
                                                    {(facility.sms || []).length > 0 && (
                                                        <HStack spacing={1}>
                                                            <FaPaperPlane size={12} color="#805AD5" />
                                                            <Text fontSize="xs">{(facility.sms || []).length} SMS(s)</Text>
                                                        </HStack>
                                                    )}
                                                </VStack>
                                            </Td>
                                            <Td>
                                                <VStack align="start" spacing={1}>
                                                    {facility.notificationPreferences?.dqRuns && (
                                                        <Badge size="sm" colorScheme="blue">DQ Runs</Badge>
                                                    )}
                                                    {facility.notificationPreferences?.comparisons && (
                                                        <Badge size="sm" colorScheme="purple">Comparisons</Badge>
                                                    )}
                                                </VStack>
                                            </Td>
                                            <Td>
                                                <Badge colorScheme={facility.enabled ? 'green' : 'red'}>
                                                    {facility.enabled ? 'Active' : 'Disabled'}
                                                </Badge>
                                            </Td>
                                            <Td>
                                                <HStack spacing={2}>
                                                    <IconButton
                                                        aria-label="Edit facility"
                                                        icon={<FaEdit />}
                                                        size="sm"
                                                        variant="outline"
                                                        colorScheme="blue"
                                                        onClick={() => openEditModal(facility)}
                                                    />
                                                    <IconButton
                                                        aria-label="Send test notification"
                                                        icon={<FaPaperPlane />}
                                                        size="sm"
                                                        variant="outline"
                                                        colorScheme="green"
                                                        onClick={() => handleSendTestNotification(facility.orgUnitId)}
                                                        isLoading={testNotificationMutation.status === 'pending'}
                                                        isDisabled={!facility.enabled}
                                                    />
                                                    <IconButton
                                                        aria-label="Delete facility"
                                                        icon={<FaTrash />}
                                                        size="sm"
                                                        variant="outline"
                                                        colorScheme="red"
                                                        onClick={() => {
                                                            if (window.confirm(`Are you sure you want to delete ${facility.name}?`)) {
                                                                deleteFacilityMutation.mutate(facility.id)
                                                            }
                                                        }}
                                                        isLoading={deleteFacilityMutation.status === 'pending'}
                                                    />
                                                </HStack>
                                            </Td>
                                        </Tr>
                                    ))}
                                </Tbody>
                            </Table>
                        </Box>
                    )}
                </Box>
            </VStack>

            {/* Facility Modal */}
            <Modal isOpen={isFacilityModalOpen} onClose={onFacilityModalClose} size="lg">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>
                        <Flex justify="space-between" align="center">
                            <Text>{editingFacility ? 'Edit Facility' : 'Add New Facility'}</Text>
                            <HStack spacing={2}>
                                <Button
                                    colorScheme="teal"
                                    size="sm"
                                    onClick={handleFacilitySubmit}
                                    isLoading={createFacilityMutation.status === 'pending' || updateFacilityMutation.status === 'pending'}
                                    isDisabled={!facilityForm.name || !facilityForm.orgUnitId}
                                >
                                    {editingFacility ? 'Update' : 'Create'}
                                </Button>
                                <ModalCloseButton position="relative" top={0} right={0} />
                            </HStack>
                        </Flex>
                    </ModalHeader>
                    <ModalBody>
                        <VStack spacing={4}>
                            <FormControl isRequired>
                                <FormLabel>Select Facility</FormLabel>
                                <DQOrgUnitPicker
                                    treeData={orgUnitTree}
                                    selectedOrgUnits={facilityForm.orgUnitId ? [facilityForm.orgUnitId] : []}
                                    selectedOrgNames={facilityForm.name ? [facilityForm.name] : []}
                                    onSelectionChange={(ids, names) => {
                                        setFacilityForm(prev => ({
                                            ...prev,
                                            orgUnitId: ids[0] || '',
                                            orgUnitName: names[0] || '',
                                            name: names[0] || '' // Auto-populate facility name
                                        }))
                                    }}
                                    label="Select facility from organisation unit tree"
                                    multiple={false}
                                    isLoading={orgUnitTreeLoading}
                                />
                                {facilityForm.orgUnitId && (
                                    <Text fontSize="xs" color="gray.600" mt={1}>
                                        UID: {facilityForm.orgUnitId}
                                    </Text>
                                )}
                            </FormControl>

                            <FormControl>
                                <FormLabel>Email Addresses</FormLabel>
                                <Textarea
                                    value={facilityForm.email}
                                    onChange={(e) => setFacilityForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="Enter email addresses separated by commas&#10;e.g., manager@facility.org, data@facility.org"
                                    rows={3}
                                />
                                <Text fontSize="xs" color="gray.600" mt={1}>
                                    Separate multiple email addresses with commas
                                </Text>
                            </FormControl>

                            <FormControl>
                                <FormLabel>WhatsApp Numbers</FormLabel>
                                <Textarea
                                    value={facilityForm.whatsapp}
                                    onChange={(e) => setFacilityForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                                    placeholder="Enter WhatsApp numbers separated by commas&#10;e.g., +1234567890, +0987654321"
                                    rows={3}
                                />
                                <Text fontSize="xs" color="gray.600" mt={1}>
                                    Include country code (e.g., +1234567890). Separate multiple numbers with commas
                                </Text>
                            </FormControl>

                            <FormControl>
                                <FormLabel>SMS Phone Numbers</FormLabel>
                                <Textarea
                                    value={facilityForm.sms}
                                    onChange={(e) => setFacilityForm(prev => ({ ...prev, sms: e.target.value }))}
                                    placeholder="Enter SMS phone numbers separated by commas&#10;e.g., +1234567890, +0987654321"
                                    rows={3}
                                />
                                <Text fontSize="xs" color="gray.600" mt={1}>
                                    Include country code (e.g., +1234567890). Separate multiple numbers with commas
                                </Text>
                            </FormControl>

                            <Divider />

                            <FormControl>
                                <FormLabel>Notification Preferences</FormLabel>
                                <VStack align="start" spacing={3}>
                                    <Checkbox
                                        isChecked={facilityForm.notificationPreferences.dqRuns}
                                        onChange={(e) => setFacilityForm(prev => ({
                                            ...prev,
                                            notificationPreferences: {
                                                ...prev.notificationPreferences,
                                                dqRuns: e.target.checked
                                            }
                                        }))}
                                    >
                                        Data Quality Run Notifications
                                    </Checkbox>
                                    <Checkbox
                                        isChecked={facilityForm.notificationPreferences.comparisons}
                                        onChange={(e) => setFacilityForm(prev => ({
                                            ...prev,
                                            notificationPreferences: {
                                                ...prev.notificationPreferences,
                                                comparisons: e.target.checked
                                            }
                                        }))}
                                    >
                                        Dataset Comparison Notifications
                                    </Checkbox>
                                    <Checkbox
                                        isChecked={facilityForm.notificationPreferences.emailEnabled}
                                        onChange={(e) => setFacilityForm(prev => ({
                                            ...prev,
                                            notificationPreferences: {
                                                ...prev.notificationPreferences,
                                                emailEnabled: e.target.checked
                                            }
                                        }))}
                                    >
                                        Enable Email Notifications
                                    </Checkbox>
                                    <Checkbox
                                        isChecked={facilityForm.notificationPreferences.whatsappEnabled}
                                        onChange={(e) => setFacilityForm(prev => ({
                                            ...prev,
                                            notificationPreferences: {
                                                ...prev.notificationPreferences,
                                                whatsappEnabled: e.target.checked
                                            }
                                        }))}
                                    >
                                        Enable WhatsApp Notifications
                                    </Checkbox>
                                    <Checkbox
                                        isChecked={facilityForm.notificationPreferences.smsEnabled}
                                        onChange={(e) => setFacilityForm(prev => ({
                                            ...prev,
                                            notificationPreferences: {
                                                ...prev.notificationPreferences,
                                                smsEnabled: e.target.checked
                                            }
                                        }))}
                                    >
                                        Enable SMS Notifications
                                    </Checkbox>
                                </VStack>
                            </FormControl>

                            <FormControl>
                                <HStack justify="space-between">
                                    <FormLabel mb={0}>Facility Enabled</FormLabel>
                                    <Switch
                                        isChecked={facilityForm.enabled}
                                        onChange={(e) => setFacilityForm(prev => ({ ...prev, enabled: e.target.checked }))}
                                        colorScheme="teal"
                                    />
                                </HStack>
                                <Text fontSize="xs" color="gray.600">
                                    Disabled facilities will not receive any notifications
                                </Text>
                            </FormControl>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>

            {/* Configuration Modal */}
            <Modal isOpen={isConfigModalOpen} onClose={onConfigModalClose} size="xl">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Configure Notification Services</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack spacing={6}>
                            {/* Email Configuration */}
                            <Box w="full" p={4} bg="blue.50" borderRadius="md">
                                <Heading size="md" mb={4} color="blue.700">
                                    <FaEnvelope style={{ display: 'inline', marginRight: '8px' }} />
                                    Email Configuration (SMTP)
                                </Heading>
                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                    <FormControl>
                                        <FormLabel>SMTP Host</FormLabel>
                                        <Input
                                            value={emailConfig.host}
                                            onChange={(e) => setEmailConfig(prev => ({ ...prev, host: e.target.value }))}
                                            placeholder="smtp.gmail.com"
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel>SMTP Port</FormLabel>
                                        <Input
                                            type="number"
                                            value={emailConfig.port}
                                            onChange={(e) => setEmailConfig(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                                            placeholder="587"
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel>Username</FormLabel>
                                        <Input
                                            value={emailConfig.user}
                                            onChange={(e) => setEmailConfig(prev => ({ ...prev, user: e.target.value }))}
                                            placeholder="your-email@gmail.com"
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel>Password / App Password</FormLabel>
                                        <Input
                                            type="password"
                                            value={emailConfig.pass}
                                            onChange={(e) => setEmailConfig(prev => ({ ...prev, pass: e.target.value }))}
                                            placeholder="Your app password"
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel>From Address</FormLabel>
                                        <Input
                                            value={emailConfig.from}
                                            onChange={(e) => setEmailConfig(prev => ({ ...prev, from: e.target.value }))}
                                            placeholder="noreply@yourdomain.com"
                                        />
                                    </FormControl>
                                </SimpleGrid>
                                <Button
                                    mt={4}
                                    colorScheme="blue"
                                    onClick={() => configureEmailMutation.mutate(emailConfig)}
                                    isLoading={configureEmailMutation.status === 'pending'}
                                    isDisabled={!emailConfig.host || !emailConfig.user || !emailConfig.pass}
                                >
                                    Save Email Configuration
                                </Button>
                            </Box>

                            {/* WhatsApp Configuration */}
                            <Box w="full" p={4} bg="green.50" borderRadius="md">
                                <Heading size="md" mb={4} color="green.700">
                                    <FaWhatsapp style={{ display: 'inline', marginRight: '8px' }} />
                                    WhatsApp Configuration (Twilio)
                                </Heading>
                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                    <FormControl>
                                        <FormLabel>Account SID</FormLabel>
                                        <Input
                                            value={whatsappConfig.accountSid}
                                            onChange={(e) => setWhatsappConfig(prev => ({ ...prev, accountSid: e.target.value }))}
                                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            fontFamily="mono"
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel>Auth Token</FormLabel>
                                        <Input
                                            type="password"
                                            value={whatsappConfig.authToken}
                                            onChange={(e) => setWhatsappConfig(prev => ({ ...prev, authToken: e.target.value }))}
                                            placeholder="Your Twilio auth token"
                                            fontFamily="mono"
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel>WhatsApp From Number</FormLabel>
                                        <Input
                                            value={whatsappConfig.fromNumber}
                                            onChange={(e) => setWhatsappConfig(prev => ({ ...prev, fromNumber: e.target.value }))}
                                            placeholder="whatsapp:+1234567890"
                                            fontFamily="mono"
                                        />
                                    </FormControl>
                                </SimpleGrid>
                                <Button
                                    mt={4}
                                    colorScheme="green"
                                    onClick={() => configureWhatsAppMutation.mutate(whatsappConfig)}
                                    isLoading={configureWhatsAppMutation.status === 'pending'}
                                    isDisabled={!whatsappConfig.accountSid || !whatsappConfig.authToken || !whatsappConfig.fromNumber}
                                >
                                    Save WhatsApp Configuration
                                </Button>
                            </Box>

                            {/* SMS Configuration */}
                            <Box w="full" p={4} bg="purple.50" borderRadius="md">
                                <Heading size="md" mb={4} color="purple.700">
                                    <FaPaperPlane style={{ display: 'inline', marginRight: '8px' }} />
                                    SMS Configuration (Twilio)
                                </Heading>
                                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                                    <FormControl>
                                        <FormLabel>Account SID</FormLabel>
                                        <Input
                                            value={smsConfig.accountSid}
                                            onChange={(e) => setSmsConfig(prev => ({ ...prev, accountSid: e.target.value }))}
                                            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                            fontFamily="mono"
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel>Auth Token</FormLabel>
                                        <Input
                                            type="password"
                                            value={smsConfig.authToken}
                                            onChange={(e) => setSmsConfig(prev => ({ ...prev, authToken: e.target.value }))}
                                            placeholder="Your Twilio auth token"
                                            fontFamily="mono"
                                        />
                                    </FormControl>
                                    <FormControl>
                                        <FormLabel>SMS From Number</FormLabel>
                                        <Input
                                            value={smsConfig.fromNumber}
                                            onChange={(e) => setSmsConfig(prev => ({ ...prev, fromNumber: e.target.value }))}
                                            placeholder="+1234567890"
                                            fontFamily="mono"
                                        />
                                    </FormControl>
                                </SimpleGrid>
                                <Button
                                    mt={4}
                                    colorScheme="purple"
                                    onClick={() => configureSMSMutation.mutate(smsConfig)}
                                    isLoading={configureSMSMutation.status === 'pending'}
                                    isDisabled={!smsConfig.accountSid || !smsConfig.authToken || !smsConfig.fromNumber}
                                >
                                    Save SMS Configuration
                                </Button>
                            </Box>
                        </VStack>
                    </ModalBody>
                    <ModalFooter>
                        <Button onClick={onConfigModalClose}>Close</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    )
}