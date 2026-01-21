import React from 'react'
import { Flex, Heading, HStack, Button, Image } from '@chakra-ui/react'
import logo from '../assets/logo.png'

export type Tab = 'dashboard' | 'dq' | 'metadata'

interface TopNavProps {
    tab: Tab
    setTab: (tab: Tab) => void
}

const TopNav: React.FC<TopNavProps> = ({ tab, setTab }) => (
    <Flex
        bg="#F7FAFC"
        px={8}
        py={4}
        align="center"
        justify="space-between"
        boxShadow="sm"
    >
        <HStack spacing={3}>
            <Image src={logo} alt="IWS-App Logo" height="100px" />
            <Heading size="md">IMPULSE STUDY Maternal Child Health Dashboard</Heading>
        </HStack>
        <HStack spacing={4}>
            <Button
                onClick={() => setTab('dashboard')}
                colorScheme={tab === 'dashboard' ? 'teal' : 'gray'}
            >
                Dashboard
            </Button>
            <Button
                onClick={() => setTab('dq')}
                colorScheme={tab === 'dq' ? 'teal' : 'gray'}
            >
                DQ Engine
            </Button>
            <Button
                onClick={() => setTab('metadata')}
                colorScheme={tab === 'metadata' ? 'teal' : 'gray'}
            >
                Metadata Assessment
            </Button>
        </HStack>
    </Flex>
)

export default TopNav
