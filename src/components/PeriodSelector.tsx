import React, { useState, useEffect } from 'react'
import {
    Box, VStack, HStack, Select, FormControl, FormLabel, Button,
    ButtonGroup, Text, Badge, Tabs, TabList, TabPanels, Tab, TabPanel,
    SimpleGrid, Tooltip, Icon
} from '@chakra-ui/react'
import { FaCalendar, FaCalendarAlt, FaCalendarWeek } from 'react-icons/fa'

interface PeriodSelectorProps {
    value: string  // YYYYMM format
    onChange: (period: string, displayName: string) => void
    label?: string
    isDisabled?: boolean
}

// Period type configurations
const PERIOD_TYPES = {
    MONTHLY: 'monthly',
    QUARTERLY: 'quarterly',
    YEARLY: 'yearly',
    FINANCIAL: 'financial'
}

const MONTHS = [
    { value: '01', label: 'January', short: 'Jan' },
    { value: '02', label: 'February', short: 'Feb' },
    { value: '03', label: 'March', short: 'Mar' },
    { value: '04', label: 'April', short: 'Apr' },
    { value: '05', label: 'May', short: 'May' },
    { value: '06', label: 'June', short: 'Jun' },
    { value: '07', label: 'July', short: 'Jul' },
    { value: '08', label: 'August', short: 'Aug' },
    { value: '09', label: 'September', short: 'Sep' },
    { value: '10', label: 'October', short: 'Oct' },
    { value: '11', label: 'November', short: 'Nov' },
    { value: '12', label: 'December', short: 'Dec' }
]

const QUARTERS = [
    { value: 'Q1', label: 'Quarter 1 (Jan-Mar)', months: ['01', '02', '03'] },
    { value: 'Q2', label: 'Quarter 2 (Apr-Jun)', months: ['04', '05', '06'] },
    { value: 'Q3', label: 'Quarter 3 (Jul-Sep)', months: ['07', '08', '09'] },
    { value: 'Q4', label: 'Quarter 4 (Oct-Dec)', months: ['10', '11', '12'] }
]

// Generate years (current year + 5 years back, 2 years forward)
const generateYears = (): string[] => {
    const currentYear = new Date().getFullYear()
    const years: string[] = []
    for (let i = currentYear + 2; i >= currentYear - 5; i--) {
        years.push(i.toString())
    }
    return years
}

// Parse YYYYMM to components
const parsePeriod = (period: string): { year: string; month: string } | null => {
    if (!period || period.length !== 6) return null
    return {
        year: period.substring(0, 4),
        month: period.substring(4, 6)
    }
}

// Format period for display
const formatPeriodDisplay = (period: string): string => {
    const parsed = parsePeriod(period)
    if (!parsed) return period

    const monthObj = MONTHS.find(m => m.value === parsed.month)
    return monthObj ? `${monthObj.label} ${parsed.year}` : period
}

export default function PeriodSelector({
    value,
    onChange,
    label = "Period",
    isDisabled = false
}: PeriodSelectorProps) {
    const [periodType, setPeriodType] = useState<string>(PERIOD_TYPES.MONTHLY)
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [selectedMonth, setSelectedMonth] = useState<string>('')
    const [selectedQuarter, setSelectedQuarter] = useState<string>('')

    const years = generateYears()
    const currentYear = new Date().getFullYear().toString()
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')

    // Initialize from value prop
    useEffect(() => {
        if (value) {
            const parsed = parsePeriod(value)
            if (parsed) {
                setSelectedYear(parsed.year)
                setSelectedMonth(parsed.month)
            }
        } else {
            // Default to current month
            setSelectedYear(currentYear)
            setSelectedMonth(currentMonth)
        }
    }, [value])

    // Handle month selection
    const handleMonthSelect = (year: string, month: string) => {
        const period = `${year}${month}`
        const display = formatPeriodDisplay(period)
        setSelectedYear(year)
        setSelectedMonth(month)
        onChange(period, display)
    }

    // Handle quarter selection
    const handleQuarterSelect = (year: string, quarter: string) => {
        const quarterObj = QUARTERS.find(q => q.value === quarter)
        if (quarterObj) {
            // Use the first month of the quarter
            const period = `${year}${quarterObj.months[0]}`
            const display = `${quarterObj.label} ${year}`
            setSelectedYear(year)
            setSelectedQuarter(quarter)
            onChange(period, display)
        }
    }

    // Handle year selection
    const handleYearSelect = (year: string) => {
        const period = `${year}01` // January
        const display = `${year}`
        setSelectedYear(year)
        onChange(period, display)
    }

    // Quick selection buttons
    const handleQuickSelect = (monthsAgo: number) => {
        const date = new Date()
        date.setMonth(date.getMonth() - monthsAgo)
        const year = date.getFullYear().toString()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        handleMonthSelect(year, month)
    }

    return (
        <FormControl isDisabled={isDisabled}>
            <FormLabel fontSize="sm" display="flex" alignItems="center">
                <Icon as={FaCalendar} mr={2} />
                {label}
            </FormLabel>

            <VStack spacing={3} align="stretch">
                {/* Current Selection Display */}
                {value && (
                    <Box
                        p={2}
                        bg="blue.50"
                        borderRadius="md"
                        border="1px solid"
                        borderColor="blue.200"
                    >
                        <Text fontSize="xs" color="blue.600" mb={1}>Selected Period:</Text>
                        <HStack>
                            <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>
                                {formatPeriodDisplay(value)}
                            </Badge>
                            <Text fontSize="xs" color="gray.600">({value})</Text>
                        </HStack>
                    </Box>
                )}

                {/* Quick Selection Buttons */}
                <Box>
                    <Text fontSize="xs" color="gray.600" mb={2}>Quick Select:</Text>
                    <HStack spacing={2} flexWrap="wrap">
                        <Button size="xs" variant="outline" onClick={() => handleQuickSelect(0)}>
                            This Month
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => handleQuickSelect(1)}>
                            Last Month
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => handleQuickSelect(2)}>
                            2 Months Ago
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => handleQuickSelect(3)}>
                            3 Months Ago
                        </Button>
                    </HStack>
                </Box>

                {/* Period Type Tabs */}
                <Tabs
                    size="sm"
                    variant="soft-rounded"
                    colorScheme="blue"
                    index={Object.values(PERIOD_TYPES).indexOf(periodType)}
                    onChange={(index) => setPeriodType(Object.values(PERIOD_TYPES)[index])}
                >
                    <TabList>
                        <Tab><Icon as={FaCalendarAlt} mr={1} />Monthly</Tab>
                        <Tab><Icon as={FaCalendarWeek} mr={1} />Quarterly</Tab>
                        <Tab><Icon as={FaCalendar} mr={1} />Yearly</Tab>
                    </TabList>

                    <TabPanels>
                        {/* Monthly Selection */}
                        <TabPanel px={0}>
                            <VStack spacing={3} align="stretch">
                                <FormControl size="sm">
                                    <FormLabel fontSize="xs">Year</FormLabel>
                                    <Select
                                        size="sm"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                    >
                                        <option value="">Select Year</option>
                                        {years.map(year => (
                                            <option key={year} value={year}>
                                                {year}
                                                {year === currentYear && ' (Current)'}
                                            </option>
                                        ))}
                                    </Select>
                                </FormControl>

                                {selectedYear && (
                                    <Box>
                                        <Text fontSize="xs" color="gray.600" mb={2}>Select Month:</Text>
                                        <SimpleGrid columns={3} spacing={2}>
                                            {MONTHS.map(month => {
                                                const isSelected = selectedMonth === month.value && selectedYear
                                                const isCurrent =
                                                    month.value === currentMonth &&
                                                    selectedYear === currentYear

                                                return (
                                                    <Tooltip key={month.value} label={month.label}>
                                                        <Button
                                                            size="sm"
                                                            variant={isSelected ? "solid" : "outline"}
                                                            colorScheme={isSelected ? "blue" : "gray"}
                                                            onClick={() => handleMonthSelect(selectedYear, month.value)}
                                                            borderWidth={isCurrent ? "2px" : "1px"}
                                                            borderColor={isCurrent ? "green.400" : undefined}
                                                        >
                                                            {month.short}
                                                            {isCurrent && <Badge ml={1} fontSize="6px" colorScheme="green">NOW</Badge>}
                                                        </Button>
                                                    </Tooltip>
                                                )
                                            })}
                                        </SimpleGrid>
                                    </Box>
                                )}
                            </VStack>
                        </TabPanel>

                        {/* Quarterly Selection */}
                        <TabPanel px={0}>
                            <VStack spacing={3} align="stretch">
                                <FormControl size="sm">
                                    <FormLabel fontSize="xs">Year</FormLabel>
                                    <Select
                                        size="sm"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                    >
                                        <option value="">Select Year</option>
                                        {years.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </Select>
                                </FormControl>

                                {selectedYear && (
                                    <Box>
                                        <Text fontSize="xs" color="gray.600" mb={2}>Select Quarter:</Text>
                                        <VStack spacing={2}>
                                            {QUARTERS.map(quarter => {
                                                const isSelected = selectedQuarter === quarter.value
                                                return (
                                                    <Button
                                                        key={quarter.value}
                                                        size="sm"
                                                        width="full"
                                                        variant={isSelected ? "solid" : "outline"}
                                                        colorScheme={isSelected ? "blue" : "gray"}
                                                        onClick={() => handleQuarterSelect(selectedYear, quarter.value)}
                                                    >
                                                        {quarter.label}
                                                    </Button>
                                                )
                                            })}
                                        </VStack>
                                    </Box>
                                )}
                            </VStack>
                        </TabPanel>

                        {/* Yearly Selection */}
                        <TabPanel px={0}>
                            <Box>
                                <Text fontSize="xs" color="gray.600" mb={2}>Select Year:</Text>
                                <SimpleGrid columns={3} spacing={2}>
                                    {years.map(year => {
                                        const isSelected = selectedYear === year
                                        const isCurrent = year === currentYear
                                        return (
                                            <Button
                                                key={year}
                                                size="sm"
                                                variant={isSelected ? "solid" : "outline"}
                                                colorScheme={isSelected ? "blue" : "gray"}
                                                onClick={() => handleYearSelect(year)}
                                                borderWidth={isCurrent ? "2px" : "1px"}
                                                borderColor={isCurrent ? "green.400" : undefined}
                                            >
                                                {year}
                                                {isCurrent && <Badge ml={1} fontSize="6px" colorScheme="green">NOW</Badge>}
                                            </Button>
                                        )
                                    })}
                                </SimpleGrid>
                            </Box>
                        </TabPanel>
                    </TabPanels>
                </Tabs>

                {/* Helper Text */}
                <Text fontSize="xs" color="gray.500">
                    DHIS2 period format: YYYYMM (e.g., 202501 for January 2025)
                </Text>
            </VStack>
        </FormControl>
    )
}
