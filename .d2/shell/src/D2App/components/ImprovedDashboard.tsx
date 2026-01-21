import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    Box,
    SimpleGrid,
    Text,
    HStack,
    VStack,
    Badge,
    Button,
    Spinner,
    Alert,
    AlertIcon,
    Stat,
    StatLabel,
    StatNumber,
    StatHelpText,
    StatArrow,
    Card,
    CardHeader,
    CardBody,
    Heading,
    Divider,
    useColorModeValue,
    Icon,
    Flex,
    Progress,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Tabs,
    TabList,
    TabPanels,
    Tab,
    TabPanel,
} from '@chakra-ui/react'
import { FaSync, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaChartLine, FaDatabase, FaClock } from 'react-icons/fa'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'

const ImprovedDashboard: React.FC = () => {
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [isRefreshing, setIsRefreshing] = useState(false)

    const bgColor = useColorModeValue('gray.50', 'gray.900')
    const cardBg = useColorModeValue('white', 'gray.800')
    const borderColor = useColorModeValue('gray.200', 'gray.700')

    // Fetch dashboard metrics
    const { data: metrics, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useQuery({
        queryKey: ['dashboard-metrics'],
        queryFn: async () => {
            const response = await fetch('http://localhost:4000/api/dashboard-metrics')
            if (!response.ok) throw new Error('Failed to fetch metrics')
            return await response.json()
        },
        refetchInterval: 30000, // Refresh every 30 seconds
        retry: 1,
    })

    // Fetch DQ runs
    const { data: dqRuns, isLoading: runsLoading, refetch: refetchRuns } = useQuery({
        queryKey: ['dq-runs'],
        queryFn: async () => {
            const response = await fetch('http://localhost:4000/api/dq-runs')
            if (!response.ok) throw new Error('Failed to fetch DQ runs')
            return await response.json()
        },
        refetchInterval: 30000,
        retry: 1,
    })

    // Fetch comparisons
    const { data: comparisons, isLoading: comparisonsLoading, refetch: refetchComparisons } = useQuery({
        queryKey: ['comparisons'],
        queryFn: async () => {
            const response = await fetch('http://localhost:4000/api/comparisons')
            if (!response.ok) throw new Error('Failed to fetch comparisons')
            return await response.json()
        },
        refetchInterval: 30000,
        retry: 1,
    })

    const handleRefresh = async () => {
        setIsRefreshing(true)
        await Promise.all([refetchMetrics(), refetchRuns(), refetchComparisons()])
        setLastUpdated(new Date())
        setIsRefreshing(false)
    }

    const isLoading = metricsLoading || runsLoading || comparisonsLoading

    if (isLoading) {
        return (
            <Box bg={bgColor} p={8} minH="calc(100vh - 72px)" display="flex" alignItems="center" justifyContent="center">
                <VStack spacing={4}>
                    <Spinner size="xl" color="blue.500" thickness="4px" />
                    <Text fontSize="lg" fontWeight="medium">Loading dashboard...</Text>
                </VStack>
            </Box>
        )
    }

    if (metricsError) {
        return (
            <Box bg={bgColor} p={8} minH="calc(100vh - 72px)">
                <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    <VStack align="start" spacing={2} flex={1}>
                        <Text fontWeight="bold">Failed to load dashboard</Text>
                        <Text fontSize="sm">Make sure the DQ engine is running at {process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : 'https://engine.dqas.hispuganda.org'}</Text>
                        <Button size="sm" onClick={handleRefresh} leftIcon={<FaSync />} isLoading={isRefreshing} mt={2}>
                            Retry Connection
                        </Button>
                    </VStack>
                </Alert>
            </Box>
        )
    }

    const hasData = (dqRuns && dqRuns.length > 0) || (comparisons && comparisons.length > 0)

    // Calculate real-time statistics
    const totalRuns = dqRuns?.length || 0
    const successfulRuns = dqRuns?.filter((r: any) => r.success).length || 0
    const failedRuns = totalRuns - successfulRuns
    const totalComparisons = comparisons?.length || 0
    const avgCompleteness = metrics?.averageCompleteness || 0
    const totalValidationErrors = metrics?.totalValidationErrors || 0

    // Recent activity (last 10 runs)
    const recentRuns = dqRuns?.slice(-10).reverse() || []

    // Comparison statistics
    const totalMismatches = comparisons?.reduce((sum: number, c: any) => sum + (c.mismatchedRecords || 0), 0) || 0
    const totalMissing = comparisons?.reduce((sum: number, c: any) => sum + (c.missingRecords || 0), 0) || 0
    const totalValid = comparisons?.reduce((sum: number, c: any) => sum + (c.validRecords || 0), 0) || 0

    // Chart: Success Rate Over Time
    const successRateChartOption: echarts.EChartsOption = {
        title: { text: 'DQ Run Success Rate', left: 'center', textStyle: { fontSize: 14, fontWeight: 'normal' } },
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: dqRuns?.slice(-20).map((r: any, i: number) => `Run ${i + 1}`) || [],
        },
        yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%' } },
        series: [{
            data: dqRuns?.slice(-20).map((r: any) => r.success ? 100 : 0) || [],
            type: 'line',
            smooth: true,
            areaStyle: { color: 'rgba(56, 178, 172, 0.2)' },
            lineStyle: { color: '#38B2AC', width: 3 },
            itemStyle: { color: '#38B2AC' },
        }],
        grid: { left: 50, right: 20, bottom: 30, top: 50 },
    }

    // Chart: Completeness Distribution
    const completenessChartOption: echarts.EChartsOption = {
        title: { text: 'Completeness Distribution', left: 'center', textStyle: { fontSize: 14, fontWeight: 'normal' } },
        tooltip: { trigger: 'item' },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            data: [
                { value: successfulRuns, name: 'Complete', itemStyle: { color: '#48BB78' } },
                { value: failedRuns, name: 'Incomplete', itemStyle: { color: '#F56565' } },
            ],
            label: { formatter: '{b}: {c} ({d}%)' },
        }],
    }

    // Chart: Comparison Results
    const comparisonChartOption: echarts.EChartsOption = {
        title: { text: 'Data Comparison Results', left: 'center', textStyle: { fontSize: 14, fontWeight: 'normal' } },
        tooltip: { trigger: 'item' },
        legend: { bottom: 10, left: 'center' },
        series: [{
            type: 'pie',
            radius: '60%',
            data: [
                { value: totalValid, name: 'Valid', itemStyle: { color: '#48BB78' } },
                { value: totalMismatches, name: 'Mismatched', itemStyle: { color: '#F6AD55' } },
                { value: totalMissing, name: 'Missing', itemStyle: { color: '#FC8181' } },
            ],
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)',
                },
            },
        }],
    }

    // Chart: Validation Errors Trend
    const validationErrorsChartOption: echarts.EChartsOption = {
        title: { text: 'Validation Errors Over Time', left: 'center', textStyle: { fontSize: 14, fontWeight: 'normal' } },
        tooltip: { trigger: 'axis' },
        xAxis: {
            type: 'category',
            data: dqRuns?.slice(-15).map((r: any, i: number) => `#${i + 1}`) || [],
        },
        yAxis: { type: 'value', name: 'Errors' },
        series: [{
            data: dqRuns?.slice(-15).map((r: any) => r.validationErrors || 0) || [],
            type: 'bar',
            itemStyle: {
                color: (params: any) => {
                    const value = params.value
                    if (value === 0) return '#48BB78'
                    if (value < 5) return '#F6AD55'
                    return '#FC8181'
                },
            },
        }],
        grid: { left: 50, right: 20, bottom: 30, top: 50 },
    }

    return (
        <Box bg={bgColor} p={6} minH="calc(100vh - 72px)">
            {/* Header */}
            <Flex justify="space-between" align="center" mb={6}>
                <Box>
                    <Heading size="lg" mb={1}>Data Quality Dashboard</Heading>
                    <Text fontSize="sm" color="gray.600">
                        Real-time monitoring and analytics
                    </Text>
                </Box>
                <HStack spacing={3}>
                    <VStack spacing={0} align="end">
                        <Text fontSize="xs" color="gray.500">Last updated</Text>
                        <Badge colorScheme="green">{lastUpdated.toLocaleTimeString()}</Badge>
                    </VStack>
                    <Button
                        leftIcon={<FaSync />}
                        colorScheme="blue"
                        size="sm"
                        onClick={handleRefresh}
                        isLoading={isRefreshing}
                    >
                        Refresh
                    </Button>
                </HStack>
            </Flex>

            {!hasData && (
                <Alert status="info" mb={6} borderRadius="md">
                    <AlertIcon />
                    <VStack align="start" spacing={1}>
                        <Text fontWeight="bold">No data available yet</Text>
                        <Text fontSize="sm">Run some DQ validations or dataset comparisons to see statistics here.</Text>
                    </VStack>
                </Alert>
            )}

            {/* Key Metrics */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={6}>
                <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                    <CardBody>
                        <Stat>
                            <StatLabel fontSize="sm">Total DQ Runs</StatLabel>
                            <StatNumber fontSize="3xl">{totalRuns}</StatNumber>
                            <StatHelpText>
                                <HStack spacing={1}>
                                    <Icon as={FaCheckCircle} color="green.500" />
                                    <Text>{successfulRuns} successful</Text>
                                </HStack>
                            </StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>

                <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                    <CardBody>
                        <Stat>
                            <StatLabel fontSize="sm">Success Rate</StatLabel>
                            <StatNumber fontSize="3xl">
                                {totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0}%
                            </StatNumber>
                            <StatHelpText>
                                <HStack spacing={1}>
                                    {failedRuns > 0 && <Icon as={FaTimesCircle} color="red.500" />}
                                    <Text>{failedRuns} failed</Text>
                                </HStack>
                            </StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>

                <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                    <CardBody>
                        <Stat>
                            <StatLabel fontSize="sm">Comparisons</StatLabel>
                            <StatNumber fontSize="3xl">{totalComparisons}</StatNumber>
                            <StatHelpText>
                                <HStack spacing={1}>
                                    <Icon as={FaDatabase} color="blue.500" />
                                    <Text>Dataset comparisons</Text>
                                </HStack>
                            </StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>

                <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                    <CardBody>
                        <Stat>
                            <StatLabel fontSize="sm">Avg Completeness</StatLabel>
                            <StatNumber fontSize="3xl">{avgCompleteness}%</StatNumber>
                            <StatHelpText>
                                <StatArrow type={avgCompleteness >= 90 ? 'increase' : 'decrease'} />
                                {avgCompleteness >= 90 ? 'Excellent' : 'Needs improvement'}
                            </StatHelpText>
                        </Stat>
                    </CardBody>
                </Card>
            </SimpleGrid>

            {/* Charts Row */}
            {hasData && (
                <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
                    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                        <CardBody>
                            <ReactECharts option={successRateChartOption} style={{ height: '300px' }} />
                        </CardBody>
                    </Card>

                    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                        <CardBody>
                            <ReactECharts option={completenessChartOption} style={{ height: '300px' }} />
                        </CardBody>
                    </Card>

                    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                        <CardBody>
                            <ReactECharts option={comparisonChartOption} style={{ height: '300px' }} />
                        </CardBody>
                    </Card>

                    <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                        <CardBody>
                            <ReactECharts option={validationErrorsChartOption} style={{ height: '300px' }} />
                        </CardBody>
                    </Card>
                </SimpleGrid>
            )}

            {/* Detailed Tabs */}
            <Card bg={cardBg} borderColor={borderColor} borderWidth="1px">
                <CardBody>
                    <Tabs colorScheme="blue">
                        <TabList>
                            <Tab>Recent Activity</Tab>
                            <Tab>Validation Errors</Tab>
                            <Tab>Comparison Details</Tab>
                        </TabList>

                        <TabPanels>
                            {/* Recent Activity Tab */}
                            <TabPanel>
                                {recentRuns.length === 0 ? (
                                    <Text color="gray.500">No recent DQ runs</Text>
                                ) : (
                                    <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>Time</Th>
                                                <Th>Org Unit</Th>
                                                <Th>Period</Th>
                                                <Th>Status</Th>
                                                <Th isNumeric>Completeness</Th>
                                                <Th isNumeric>Errors</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {recentRuns.map((run: any) => (
                                                <Tr key={run.id}>
                                                    <Td>
                                                        <Text fontSize="xs">
                                                            {new Date(run.timestamp).toLocaleTimeString()}
                                                        </Text>
                                                    </Td>
                                                    <Td>{run.orgUnitName || run.orgUnit}</Td>
                                                    <Td>{run.period}</Td>
                                                    <Td>
                                                        <Badge colorScheme={run.success ? 'green' : 'red'}>
                                                            {run.success ? 'Success' : 'Failed'}
                                                        </Badge>
                                                    </Td>
                                                    <Td isNumeric>
                                                        <Progress
                                                            value={run.completeness * 100}
                                                            size="sm"
                                                            colorScheme={run.completeness > 0.9 ? 'green' : 'orange'}
                                                            borderRadius="md"
                                                        />
                                                    </Td>
                                                    <Td isNumeric>
                                                        {run.validationErrors === 0 ? (
                                                            <Badge colorScheme="green">0</Badge>
                                                        ) : (
                                                            <Badge colorScheme="red">{run.validationErrors}</Badge>
                                                        )}
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                )}
                            </TabPanel>

                            {/* Validation Errors Tab */}
                            <TabPanel>
                                <VStack align="stretch" spacing={4}>
                                    <HStack>
                                        <Icon as={FaExclamationTriangle} color="orange.500" />
                                        <Text fontWeight="bold">Total Validation Errors: {totalValidationErrors}</Text>
                                    </HStack>
                                    {dqRuns?.filter((r: any) => r.validationErrors > 0).length === 0 ? (
                                        <Text color="gray.500">No validation errors found! 🎉</Text>
                                    ) : (
                                        <Table variant="simple" size="sm">
                                            <Thead>
                                                <Tr>
                                                    <Th>Time</Th>
                                                    <Th>Org Unit</Th>
                                                    <Th>Period</Th>
                                                    <Th isNumeric>Errors</Th>
                                                    <Th isNumeric>Conflicts</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {dqRuns?.filter((r: any) => r.validationErrors > 0).slice(0, 10).map((run: any) => (
                                                    <Tr key={run.id}>
                                                        <Td>
                                                            <Text fontSize="xs">
                                                                {new Date(run.timestamp).toLocaleString()}
                                                            </Text>
                                                        </Td>
                                                        <Td>{run.orgUnitName || run.orgUnit}</Td>
                                                        <Td>{run.period}</Td>
                                                        <Td isNumeric>
                                                            <Badge colorScheme="red">{run.validationErrors}</Badge>
                                                        </Td>
                                                        <Td isNumeric>
                                                            <Badge colorScheme="orange">{run.dataConflicts}</Badge>
                                                        </Td>
                                                    </Tr>
                                                ))}
                                            </Tbody>
                                        </Table>
                                    )}
                                </VStack>
                            </TabPanel>

                            {/* Comparison Details Tab */}
                            <TabPanel>
                                {comparisons && comparisons.length === 0 ? (
                                    <Text color="gray.500">No dataset comparisons yet</Text>
                                ) : (
                                    <Table variant="simple" size="sm">
                                        <Thead>
                                            <Tr>
                                                <Th>Time</Th>
                                                <Th>Datasets</Th>
                                                <Th isNumeric>Total</Th>
                                                <Th isNumeric>Valid</Th>
                                                <Th isNumeric>Mismatched</Th>
                                                <Th isNumeric>Missing</Th>
                                            </Tr>
                                        </Thead>
                                        <Tbody>
                                            {comparisons?.slice(-10).reverse().map((comp: any) => (
                                                <Tr key={comp.id}>
                                                    <Td>
                                                        <Text fontSize="xs">
                                                            {new Date(comp.timestamp).toLocaleString()}
                                                        </Text>
                                                    </Td>
                                                    <Td>
                                                        <Badge>{comp.datasets?.length || 0} datasets</Badge>
                                                    </Td>
                                                    <Td isNumeric>{comp.totalRecords}</Td>
                                                    <Td isNumeric>
                                                        <Badge colorScheme="green">{comp.validRecords}</Badge>
                                                    </Td>
                                                    <Td isNumeric>
                                                        <Badge colorScheme="orange">{comp.mismatchedRecords}</Badge>
                                                    </Td>
                                                    <Td isNumeric>
                                                        <Badge colorScheme="red">{comp.missingRecords}</Badge>
                                                    </Td>
                                                </Tr>
                                            ))}
                                        </Tbody>
                                    </Table>
                                )}
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </CardBody>
            </Card>
        </Box>
    )
}

export default ImprovedDashboard
