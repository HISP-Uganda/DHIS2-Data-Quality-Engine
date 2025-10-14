import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    Box,
    SimpleGrid,
    Text,
    Icon,
    AspectRatio,
    HStack,
    VStack,
    Badge,
    Button,
    Spinner,
    Alert,
    AlertIcon,
} from '@chakra-ui/react'
import { FaSync } from 'react-icons/fa'
import ReactECharts from 'echarts-for-react'
import * as echarts from 'echarts'

const DashboardView: React.FC = () => {
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [useRealData, setUseRealData] = useState(true)
    
    const pageBg = '#F7FAFC'
    const cardBg = '#FFFFFF'
    const headingColor = '#2D3748'
    const textColor = '#4A5568'
    const accent = '#319795'
    
    // Fetch real dashboard metrics from API (only if enabled)
    const { data: dashboardMetrics, isLoading, error, refetch } = useQuery({
        queryKey: ['dashboard-metrics', useRealData],
        queryFn: async () => {
            // Since proxy seems to have issues, try direct connection first
            console.log('Attempting direct connection to DQ engine: http://localhost:4000/api/dashboard-metrics')
            
            try {
                const response = await fetch('http://localhost:4000/api/dashboard-metrics', {
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
                
                if (!response.ok) {
                    throw new Error(`DQ engine responded with ${response.status}: ${response.statusText}`)
                }
                
                const data = await response.json()
                console.log('Direct connection successful, received metrics:', data)
                return data
                
            } catch (err) {
                console.error('Direct connection failed:', err)
                
                // Fallback: try proxy as secondary option
                console.log('Trying proxy fallback: /api/dashboard-metrics')
                
                try {
                    const proxyResponse = await fetch('/api/dashboard-metrics')
                    if (proxyResponse.ok && proxyResponse.headers.get('content-type')?.includes('application/json')) {
                        console.log('Proxy fallback successful')
                        return proxyResponse.json()
                    } else {
                        throw new Error(`Proxy failed - got ${proxyResponse.headers.get('content-type')} instead of JSON`)
                    }
                } catch (proxyErr) {
                    console.error('Proxy fallback also failed:', proxyErr)
                    
                    // Throw detailed error for both attempts
                    const directError = err instanceof Error ? err.message : String(err)
                    const proxyError = proxyErr instanceof Error ? proxyErr.message : String(proxyErr)
                    throw new Error(`DQ engine connection failed: ${directError}. Proxy also failed: ${proxyError}`)
                }
            }
        },
        enabled: useRealData, // Only fetch when real data mode is enabled
        refetchInterval: useRealData ? 30 * 1000 : false, // Refresh every 30 seconds when enabled
        staleTime: 15 * 1000, // Consider data stale after 15 seconds for real-time feel
        retry: 1, // Retry once on failure
        retryDelay: 2000, // Wait 2 seconds before retry
    })
    
    // Fallback to demo data when real data is disabled or failed
    const fallbackMetrics = {
        totalDQRuns: 0,
        successfulRuns: 0,
        totalValidationErrors: 0,
        totalDatasetComparisons: 0,
        averageCompleteness: 0,
        consensusPercentage: 0,
        activeDQJobs: 0,
        lastRunTime: null,
        recentErrors: [],
        facilityStats: [],
        regionalStats: [
            { region: 'Central Region', completeness: 0, facilities: 0 },
            { region: 'Eastern Region', completeness: 0, facilities: 0 },
            { region: 'Western Region', completeness: 0, facilities: 0 },
            { region: 'Northern Region', completeness: 0, facilities: 0 },
            { region: 'Southern Region', completeness: 0, facilities: 0 },
        ],
        trendsData: [
            { period: 'Week 1', completeness: 0, accuracy: 0 },
            { period: 'Week 2', completeness: 0, accuracy: 0 },
            { period: 'Week 3', completeness: 0, accuracy: 0 },
            { period: 'Week 4', completeness: 0, accuracy: 0 },
            { period: 'Week 5', completeness: 0, accuracy: 0 },
            { period: 'Week 6', completeness: 0, accuracy: 0 },
            { period: 'Week 7', completeness: 0, accuracy: 0 },
        ],
        dataQualityDimensions: {
            completenessOfSourceRegister: {
                name: 'Completeness of Source Register',
                description: 'No data available',
                numerator: 0,
                denominator: 0,
                percentage: 0,
                status: 'poor' as const
            },
            availabilityOfReportedData: {
                name: 'Availability of Reported Data',
                description: 'No data available',
                numerator: 0,
                denominator: 0,
                percentage: 0,
                status: 'poor' as const
            },
            accuracyOfReportedData: {
                name: 'Accuracy of Reported Data',
                description: 'No data available',
                numerator: 0,
                denominator: 0,
                percentage: 0,
                status: 'poor' as const
            },
            internalConsistency: {
                name: 'Internal Consistency',
                description: 'No data available',
                numerator: 0,
                denominator: 0,
                percentage: 0,
                status: 'poor' as const
            }
        }
    }
    
    const displayMetrics = dashboardMetrics || fallbackMetrics
    
    // Auto-refresh every 5 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            setLastUpdated(new Date())
        }, 5 * 60 * 1000)
        
        return () => clearInterval(interval)
    }, [])
    
    const handleRefresh = () => {
        setIsRefreshing(true)
        refetch().finally(() => {
            setLastUpdated(new Date())
            setIsRefreshing(false)
        })
    }

    // Use real data or fallback to defaults
    const metrics = [
        { 
            label: 'Data Completeness', 
            value: dashboardMetrics ? `${dashboardMetrics.averageCompleteness}%` : '0%', 
            gradient: 'linear(to-br, teal.400, blue.400)', 
            icon: '📊' 
        },
        { 
            label: 'Validation Errors', 
            value: dashboardMetrics ? dashboardMetrics.totalValidationErrors.toString() : '0', 
            gradient: 'linear(to-br, red.400, pink.400)', 
            icon: '⚠️' 
        },
        { 
            label: 'Dataset Comparisons', 
            value: dashboardMetrics ? dashboardMetrics.totalDatasetComparisons.toString() : '0', 
            gradient: 'linear(to-br, orange.400, yellow.400)', 
            icon: '🔍' 
        },
        { 
            label: 'Consensus Values', 
            value: dashboardMetrics ? `${dashboardMetrics.consensusPercentage}%` : '0%', 
            gradient: 'linear(to-br, green.400, green.600)', 
            icon: '✅' 
        },
        { 
            label: 'Total DQ Runs', 
            value: dashboardMetrics ? dashboardMetrics.totalDQRuns.toString() : '0', 
            gradient: 'linear(to-br, purple.400, indigo.400)', 
            icon: '⚙️' 
        },
    ]

    const dataQualityIssuesOption: echarts.EChartsOption = {
        tooltip: { trigger: 'item' },
        legend: { bottom: 10, textStyle: { color: textColor } },
        color: ['#E53E3E', '#DD6B20', '#D69E2E', '#38B2AC'],
        series: [
            {
                name: 'Data Quality Issues',
                type: 'pie',
                radius: ['40%', '70%'],
                data: [
                    { value: 15, name: 'Missing Values' },
                    { value: 8, name: 'Out of Range' },
                    { value: 12, name: 'Mismatched' },
                    { value: 65, name: 'Valid' },
                ],
                label: { color: textColor, formatter: '{b}: {d}%' },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0,0,0,0.5)',
                    },
                },
                animationDuration: 800,
            },
        ],
    }

    const dataCompletenessGaugeOption: echarts.EChartsOption = {
        series: [
            {
                type: 'gauge',
                progress: { show: true, width: 12 },
                axisLine: {
                    lineStyle: { 
                        width: 12, 
                        color: [[dashboardMetrics ? dashboardMetrics.averageCompleteness / 100 : 0, accent], [1, '#FED7D7']] 
                    },
                },
                detail: {
                    valueAnimation: true,
                    fontSize: 18,
                    color: textColor,
                    formatter: '{value}%',
                },
                data: [{ value: dashboardMetrics ? dashboardMetrics.averageCompleteness : 0, name: 'Completeness' }],
                axisLabel: { color: textColor },
                splitLine: { length: 10 },
                animationDuration: 1000,
                title: {
                    color: textColor,
                    fontSize: 12,
                },
            },
        ],
    }

    const datasetComparisonOption: echarts.EChartsOption = {
        legend: { top: 'bottom', textStyle: { color: textColor } },
        toolbox: {
            show: true,
            feature: {
                dataView: { show: true, readOnly: false },
                restore: { show: true },
                saveAsImage: { show: true },
            },
        },
        series: [
            {
                name: 'Dataset Comparison Results',
                type: 'pie',
                radius: ['40%', '80%'],
                center: ['50%', '50%'],
                roseType: 'area',
                itemStyle: { borderRadius: 8 },
                data: [
                    { value: 89, name: 'Consensus Found' },
                    { value: 23, name: 'Mismatched Values' },
                    { value: 15, name: 'Missing Data' },
                    { value: 8, name: 'Rule Violations' },
                    { value: 12, name: 'Pending Review' },
                ],
                animationDuration: 1200,
            },
        ],
    }

    const orgUnitCompletionOption: echarts.EChartsOption = {
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: {
            type: 'value',
            axisLine: { lineStyle: { color: textColor } },
            axisLabel: { color: textColor, formatter: '{value}%' },
            max: 100,
        },
        yAxis: {
            type: 'category',
            data: ['Central Region', 'Eastern Region', 'Western Region', 'Northern Region', 'Southern Region'],
            axisLine: { lineStyle: { color: textColor } },
            axisLabel: { color: textColor },
        },
        series: [
            {
                name: 'Data Completeness',
                type: 'bar',
                data: [96.2, 92.8, 89.5, 91.3, 94.7],
                itemStyle: { 
                    color: (params: any) => {
                        const colors = ['#38B2AC', '#38B2AC', '#DD6B20', '#38B2AC', '#38B2AC']
                        return colors[params.dataIndex]
                    }
                },
                barWidth: '60%',
                animationDuration: 800,
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{c}%',
                    color: textColor,
                },
            },
        ],
    }

    const facilityValidationOption: echarts.EChartsOption = {
        tooltip: { trigger: 'axis' },
        legend: { bottom: 0, textStyle: { color: textColor } },
        xAxis: {
            type: 'category',
            data: ['Mulago Hospital', 'Butabika Hospital', 'Kawempe HC IV', 'Kiruddu Hospital', 'Naguru Hospital'],
            axisLine: { lineStyle: { color: textColor } },
            axisLabel: { color: textColor, interval: 0, rotate: 45 },
        },
        yAxis: {
            type: 'value',
            axisLine: { lineStyle: { color: textColor } },
            axisLabel: { color: textColor },
            name: 'Number of Issues',
            nameTextStyle: { color: textColor },
        },
        series: [
            {
                name: 'Missing Values',
                type: 'bar',
                stack: 'validation',
                data: [3, 7, 1, 2, 0],
                itemStyle: { color: '#E53E3E' },
                animationDuration: 1000,
            },
            {
                name: 'Out of Range',
                type: 'bar',
                stack: 'validation',
                data: [1, 2, 3, 0, 1],
                itemStyle: { color: '#DD6B20' },
                animationDuration: 1000,
            },
            {
                name: 'Data Conflicts',
                type: 'bar',
                stack: 'validation',
                data: [0, 1, 0, 1, 0],
                itemStyle: { color: '#D69E2E' },
                animationDuration: 1000,
            },
        ],
    }

    const dataQualityTrendOption: echarts.EChartsOption = {
        tooltip: { trigger: 'axis' },
        legend: { top: 0, textStyle: { color: textColor } },
        xAxis: {
            type: 'category',
            data: ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025', 'Jul 2025'],
            axisLine: { lineStyle: { color: textColor } },
            axisLabel: { color: textColor },
        },
        yAxis: {
            type: 'value',
            axisLine: { lineStyle: { color: textColor } },
            axisLabel: { color: textColor, formatter: '{value}%' },
            max: 100,
            name: 'Percentage',
            nameTextStyle: { color: textColor },
        },
        series: [
            {
                name: 'Data Completeness',
                type: 'line',
                data: [91.2, 92.5, 93.1, 92.8, 94.2, 93.7, 94.2],
                itemStyle: { color: '#38B2AC' },
                lineStyle: { width: 3 },
                symbol: 'circle',
                symbolSize: 6,
                animationDuration: 800,
            },
            {
                name: 'Data Accuracy',
                type: 'line',
                data: [88.5, 89.2, 90.1, 91.3, 92.1, 91.8, 93.2],
                itemStyle: { color: '#3182CE' },
                lineStyle: { width: 3 },
                symbol: 'circle',
                symbolSize: 6,
                animationDuration: 800,
            },
        ],
    }

    // Data Quality Dimensions Bar Chart
    const dataQualityDimensionsBarOption: echarts.EChartsOption = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
                const data = params[0]
                const dimension = displayMetrics.dataQualityDimensions
                const dimData = Object.values(dimension)[data.dataIndex]
                return `${dimData.name}<br/>
                        ${dimData.numerator}/${dimData.denominator} facilities<br/>
                        <strong>${dimData.percentage}%</strong>`
            }
        },
        xAxis: {
            type: 'value',
            axisLine: { lineStyle: { color: textColor } },
            axisLabel: { color: textColor, formatter: '{value}%' },
            max: 100,
        },
        yAxis: {
            type: 'category',
            data: [
                'Internal\nConsistency',
                'Accuracy of\nReported Data',
                'Availability of\nReported Data',
                'Completeness of\nSource Register'
            ],
            axisLine: { lineStyle: { color: textColor } },
            axisLabel: { color: textColor, fontSize: 11 },
        },
        series: [
            {
                name: 'Percentage',
                type: 'bar',
                data: [
                    displayMetrics.dataQualityDimensions.internalConsistency.percentage,
                    displayMetrics.dataQualityDimensions.accuracyOfReportedData.percentage,
                    displayMetrics.dataQualityDimensions.availabilityOfReportedData.percentage,
                    displayMetrics.dataQualityDimensions.completenessOfSourceRegister.percentage
                ],
                itemStyle: {
                    color: (params: any) => {
                        const percentage = params.value
                        if (percentage >= 95) return '#38A169'
                        if (percentage >= 85) return '#68D391'
                        if (percentage >= 70) return '#F6AD55'
                        return '#FC8181'
                    }
                },
                barWidth: '60%',
                animationDuration: 800,
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{c}%',
                    color: textColor,
                },
            },
        ],
    }

    // Data Quality Dimensions Gauge Chart
    const dataQualityDimensionsGaugeOption: echarts.EChartsOption = {
        series: Object.values(displayMetrics.dataQualityDimensions).map((dim, index) => ({
            type: 'gauge',
            center: [`${25 + (index % 2) * 50}%`, `${25 + Math.floor(index / 2) * 50}%`],
            radius: '35%',
            progress: { show: true, width: 8 },
            axisLine: {
                lineStyle: {
                    width: 8,
                    color: [[dim.percentage / 100,
                        dim.status === 'excellent' ? '#38A169' :
                        dim.status === 'good' ? '#68D391' :
                        dim.status === 'fair' ? '#F6AD55' : '#FC8181'
                    ], [1, '#FED7D7']]
                },
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            detail: {
                valueAnimation: true,
                fontSize: 14,
                color: textColor,
                formatter: '{value}%',
                offsetCenter: [0, '20%']
            },
            title: {
                fontSize: 10,
                color: textColor,
                offsetCenter: [0, '-30%'],
            },
            data: [{ value: dim.percentage, name: dim.name.split(' ').slice(0, 2).join(' ') }],
            animationDuration: 1000,
        }))
    }

    // Data Quality Dimensions Radar Chart
    const dataQualityDimensionsRadarOption: echarts.EChartsOption = {
        radar: {
            indicator: [
                { name: 'Completeness', max: 100 },
                { name: 'Availability', max: 100 },
                { name: 'Accuracy', max: 100 },
                { name: 'Consistency', max: 100 },
            ],
            axisName: {
                color: textColor,
                fontSize: 12
            },
            splitArea: {
                areaStyle: {
                    color: ['rgba(56, 178, 172, 0.1)', 'rgba(56, 178, 172, 0.05)']
                }
            }
        },
        series: [
            {
                name: 'Data Quality Dimensions',
                type: 'radar',
                data: [
                    {
                        value: [
                            displayMetrics.dataQualityDimensions.completenessOfSourceRegister.percentage,
                            displayMetrics.dataQualityDimensions.availabilityOfReportedData.percentage,
                            displayMetrics.dataQualityDimensions.accuracyOfReportedData.percentage,
                            displayMetrics.dataQualityDimensions.internalConsistency.percentage,
                        ],
                        name: 'Current Performance',
                        areaStyle: {
                            color: 'rgba(56, 178, 172, 0.2)'
                        },
                        lineStyle: {
                            color: '#38B2AC',
                            width: 2
                        },
                        itemStyle: {
                            color: '#38B2AC'
                        }
                    }
                ],
                animationDuration: 1000
            }
        ]
    }

    // Show loading state
    if (isLoading) {
        return (
            <Box bg={pageBg} p={8} minH="calc(100vh - 72px)" display="flex" alignItems="center" justifyContent="center">
                <VStack spacing={4}>
                    <Spinner size="xl" color="blue.500" />
                    <Text>Loading dashboard metrics...</Text>
                </VStack>
            </Box>
        )
    }

    // Show error state
    if (error) {
        return (
            <Box bg={pageBg} p={8} minH="calc(100vh - 72px)">
                <Alert status="error">
                    <AlertIcon />
                    <VStack align="start" spacing={2}>
                        <Text fontWeight="bold">Failed to load dashboard metrics</Text>
                        <Text fontSize="sm">Error: {error.message}</Text>
                        <Text fontSize="sm">Make sure DQ engine is running on port 4000</Text>
                        <Text fontSize="xs" color="gray.600">
                            Direct test: <a href="http://localhost:4000/api/dashboard-metrics" target="_blank" rel="noopener">http://localhost:4000/api/dashboard-metrics</a>
                        </Text>
                        <Button size="sm" onClick={handleRefresh} leftIcon={<FaSync />} isLoading={isRefreshing}>
                            Retry
                        </Button>
                    </VStack>
                </Alert>
            </Box>
        )
    }

    return (
        <Box bg={pageBg} p={8} minH="calc(100vh - 72px)">
            {/* HEADER */}
            <HStack justifyContent="space-between" mb={6}>
                <Box>
                    <Text fontSize="2xl" fontWeight="bold" color={headingColor}>
                        Data Quality Dashboard
                    </Text>
                    <Text fontSize="sm" color={textColor}>
                        Real-time monitoring of DHIS2 data quality and validation
                    </Text>
                </Box>
                <HStack spacing={4}>
                    <VStack spacing={0} align="end">
                        <Text fontSize="xs" color="gray.500">
                            Last updated
                        </Text>
                        <Badge colorScheme="green" variant="subtle">
                            {lastUpdated.toLocaleTimeString()}
                        </Badge>
                    </VStack>
                    <Button
                        leftIcon={<FaSync />}
                        colorScheme="blue"
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        isLoading={isRefreshing}
                        loadingText="Refreshing"
                    >
                        Refresh
                    </Button>
                </HStack>
            </HStack>

            {/* METRICS */}
            <SimpleGrid columns={{ base: 1, md: 5 }} gap={6} mb={8}>
                {metrics.map((metric) => (
                    <Box
                        key={metric.label}
                        bgGradient={metric.gradient}
                        color="white"
                        p={6}
                        borderRadius="md"
                        boxShadow="md"
                        textAlign="center"
                        _hover={{ transform: 'translateY(-4px)' }}
                        transition="all 0.2s"
                    >
                        <Text fontSize="2xl" mb={2}>{metric.icon}</Text>
                        <Text fontSize="sm" mb={2}>
                            {metric.label}
                        </Text>
                        <Text fontSize="2xl" fontWeight="bold">
                            {metric.value}
                        </Text>
                    </Box>
                ))}
            </SimpleGrid>

            {/* ROW 2 */}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} mb={8}>
                {[dataQualityIssuesOption, dataCompletenessGaugeOption, datasetComparisonOption].map((opt, i) => (
                    <Box key={i} bg={cardBg} p={6} borderRadius="md" boxShadow="md">
                        <Text fontSize="lg" mb={4} color={headingColor}>
                            {['Data Quality Status', 'Data Completeness Rate', 'Dataset Comparison Results'][i]}
                        </Text>
                        <AspectRatio ratio={4 / 3}>
                            <ReactECharts option={opt} style={{ width: '100%' }} />
                        </AspectRatio>
                    </Box>
                ))}
            </SimpleGrid>

            {/* ROW 3 */}
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} mb={8}>
                {[
                    { opt: orgUnitCompletionOption, label: 'Regional Data Completeness' },
                    { opt: facilityValidationOption, label: 'Validation Issues by Facility' },
                    { opt: dataQualityTrendOption, label: 'Data Quality Trends' },
                ].map(({ opt, label }, i) => (
                    <Box key={i} bg={cardBg} p={6} borderRadius="md" boxShadow="md">
                        <Text fontSize="lg" mb={4} color={headingColor}>
                            {label}
                        </Text>
                        <AspectRatio ratio={4 / 3}>
                            <ReactECharts option={opt} style={{ width: '100%' }} />
                        </AspectRatio>
                    </Box>
                ))}
            </SimpleGrid>

            {/* DATA QUALITY DIMENSIONS SECTION */}
            <Box mb={6}>
                <Text fontSize="xl" fontWeight="bold" color={headingColor} mb={4}>
                    Data Quality Dimensions
                </Text>
                <Text fontSize="sm" color={textColor} mb={6}>
                    Comprehensive assessment of data quality across four key dimensions: completeness, availability, accuracy, and internal consistency.
                </Text>
            </Box>

            {/* ROW 4 - Data Quality Dimensions */}
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} mb={8}>
                <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md">
                    <Text fontSize="lg" mb={4} color={headingColor}>
                        Dimensions Overview (Bar Chart)
                    </Text>
                    <AspectRatio ratio={4 / 3}>
                        <ReactECharts option={dataQualityDimensionsBarOption} style={{ width: '100%' }} />
                    </AspectRatio>
                </Box>

                <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md">
                    <Text fontSize="lg" mb={4} color={headingColor}>
                        Performance Radar
                    </Text>
                    <AspectRatio ratio={4 / 3}>
                        <ReactECharts option={dataQualityDimensionsRadarOption} style={{ width: '100%' }} />
                    </AspectRatio>
                </Box>
            </SimpleGrid>

            {/* ROW 5 - Data Quality Dimensions Gauges */}
            <Box bg={cardBg} p={6} borderRadius="md" boxShadow="md" mb={8}>
                <Text fontSize="lg" mb={4} color={headingColor}>
                    Data Quality Dimensions - Multi-Gauge View
                </Text>
                <AspectRatio ratio={2 / 1}>
                    <ReactECharts option={dataQualityDimensionsGaugeOption} style={{ width: '100%' }} />
                </AspectRatio>
            </Box>

            {/* ROW 6 - Detailed Dimension Cards */}
            <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
                {Object.entries(displayMetrics.dataQualityDimensions).map(([key, dimension]) => {
                    const typedDimension = dimension as {
                        name: string
                        description: string
                        numerator: number
                        denominator: number
                        percentage: number
                        status: 'excellent' | 'good' | 'fair' | 'poor'
                    }
                    return (
                    <Box key={key} bg={cardBg} p={6} borderRadius="md" boxShadow="md" border="1px solid #E2E8F0">
                        <VStack align="start" spacing={3}>
                            <HStack justify="space-between" w="100%">
                                <Text fontSize="md" fontWeight="bold" color={headingColor}>
                                    {typedDimension.name}
                                </Text>
                                <Badge
                                    colorScheme={
                                        typedDimension.status === 'excellent' ? 'green' :
                                        typedDimension.status === 'good' ? 'blue' :
                                        typedDimension.status === 'fair' ? 'yellow' : 'red'
                                    }
                                    variant="solid"
                                >
                                    {typedDimension.status.toUpperCase()}
                                </Badge>
                            </HStack>

                            <Text fontSize="xs" color={textColor} noOfLines={3}>
                                {typedDimension.description}
                            </Text>

                            <VStack align="start" spacing={1} w="100%">
                                <HStack justify="space-between" w="100%">
                                    <Text fontSize="sm" color={textColor}>
                                        Progress:
                                    </Text>
                                    <Text fontSize="sm" fontWeight="bold" color={headingColor}>
                                        {typedDimension.percentage}%
                                    </Text>
                                </HStack>

                                <Box w="100%" bg="gray.200" borderRadius="full" h="8px">
                                    <Box
                                        bg={
                                            typedDimension.status === 'excellent' ? 'green.500' :
                                            typedDimension.status === 'good' ? 'blue.500' :
                                            typedDimension.status === 'fair' ? 'yellow.500' : 'red.500'
                                        }
                                        h="100%"
                                        borderRadius="full"
                                        w={`${typedDimension.percentage}%`}
                                        transition="width 0.5s ease"
                                    />
                                </Box>

                                <Text fontSize="xs" color={textColor}>
                                    {typedDimension.numerator} out of {typedDimension.denominator} facilities
                                </Text>
                            </VStack>
                        </VStack>
                    </Box>
                    )
                })}
            </SimpleGrid>
        </Box>
    )
}

export default DashboardView
