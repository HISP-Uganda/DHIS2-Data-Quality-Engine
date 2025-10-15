import { Box, Button, Stack, Text, useDisclosure, Badge, Flex, useOutsideClick, SimpleGrid, Tooltip, Icon } from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import React, { useRef, useState } from "react";
import { FaCalendar, FaCalendarAlt, FaCalendarWeek } from 'react-icons/fa'

interface DQPeriodPickerProps {
    value: string; // YYYYMM format
    onChange: (period: string, displayName: string) => void;
    isDisabled?: boolean;
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

const generateYears = (): string[] => {
    const currentYear = new Date().getFullYear()
    const years: string[] = []
    for (let i = currentYear + 2; i >= currentYear - 5; i--) {
        years.push(i.toString())
    }
    return years
}

const parsePeriod = (period: string): { year: string; month: string } | null => {
    if (!period || period.length !== 6) return null
    return {
        year: period.substring(0, 4),
        month: period.substring(4, 6)
    }
}

const formatPeriodDisplay = (period: string): string => {
    const parsed = parsePeriod(period)
    if (!parsed) return period

    const monthObj = MONTHS.find(m => m.value === parsed.month)
    return monthObj ? `${monthObj.label} ${parsed.year}` : period
}

const DQPeriodPicker = ({ value, onChange, isDisabled = false }: DQPeriodPickerProps) => {
    const { isOpen, onToggle, onClose } = useDisclosure()
    const ref = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [selectedMonth, setSelectedMonth] = useState<string>('')

    const years = generateYears()
    const currentYear = new Date().getFullYear().toString()
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0')

    useOutsideClick({ ref, handler: onClose })

    // Initialize from value prop when modal opens
    React.useEffect(() => {
        if (isOpen && value) {
            const parsed = parsePeriod(value)
            if (parsed) {
                setSelectedYear(parsed.year)
                setSelectedMonth(parsed.month)
            }
        } else if (isOpen && !value) {
            // Default to current
            setSelectedYear(currentYear)
            setSelectedMonth(currentMonth)
        }
    }, [isOpen, value])

    const handleMonthSelect = (year: string, month: string) => {
        const period = `${year}${month}`
        const display = formatPeriodDisplay(period)
        setSelectedYear(year)
        setSelectedMonth(month)
        onChange(period, display)
        onClose()
    }

    const handleQuickSelect = (monthsAgo: number) => {
        const date = new Date()
        date.setMonth(date.getMonth() - monthsAgo)
        const year = date.getFullYear().toString()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        handleMonthSelect(year, month)
    }

    const getModalPosition = () => {
        if (buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect()
            const modalWidth = 600
            const modalHeight = 450

            let top = buttonRect.bottom + 8
            let left = buttonRect.left

            if (left + modalWidth > window.innerWidth) {
                left = window.innerWidth - modalWidth - 16
            }

            if (top + modalHeight > window.innerHeight) {
                top = buttonRect.top - modalHeight - 8
            }

            left = Math.max(16, left)
            top = Math.max(16, top)

            return { top, left }
        }
        return { top: "50%", left: "50%" }
    }

    const displayText = value ? formatPeriodDisplay(value) : "Select Period"

    return (
        <Stack position="relative" flex={1} spacing={1}>
            <Flex align="center">
                <Button
                    ref={buttonRef}
                    onClick={onToggle}
                    w="200px"
                    size="md"
                    variant="outline"
                    colorScheme={value ? "green" : "blue"}
                    _hover={{ bg: value ? "green.50" : "blue.50" }}
                    isDisabled={isDisabled}
                    justifyContent="space-between"
                    rightIcon={
                        <ChevronDownIcon
                            transform={isOpen ? "rotate(180deg)" : "rotate(0deg)"}
                            transition="transform 0.2s"
                        />
                    }
                >
                    <Flex align="center" flex={1} minW={0}>
                        <Icon as={FaCalendar} mr={2} />
                        <Text
                            fontSize="sm"
                            whiteSpace="nowrap"
                            overflow="hidden"
                            textOverflow="ellipsis"
                        >
                            {displayText}
                        </Text>
                    </Flex>
                </Button>

                {value && (
                    <Badge ml={2} colorScheme="green" px={2} py={1}>
                        {value}
                    </Badge>
                )}
            </Flex>

            {isOpen && (
                <Box
                    ref={ref}
                    position="fixed"
                    top={`${getModalPosition().top}px`}
                    left={`${getModalPosition().left}px`}
                    bg="white"
                    boxShadow="2xl"
                    border="1px solid"
                    borderColor="gray.200"
                    borderRadius="md"
                    w="600px"
                    maxH="450px"
                    zIndex={10000}
                    overflow="hidden"
                >
                    {/* Header */}
                    <Box px="3" py="2" textAlign="right" borderBottom="1px solid" borderColor="gray.200" bg="gray.50">
                        <Text fontSize="md" fontWeight="semibold" float="left" mt="1">
                            Select Period
                        </Text>
                        <Button
                            size="xs"
                            colorScheme="gray"
                            variant="ghost"
                            onClick={onClose}
                        >
                            ✕
                        </Button>
                    </Box>

                    {/* Quick Select */}
                    <Box px="3" py="2" bg="blue.50" borderBottom="1px solid" borderColor="blue.200">
                        <Text fontSize="xs" color="blue.700" mb={2} fontWeight="medium">
                            Quick Select:
                        </Text>
                        <Flex gap={2} flexWrap="wrap">
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
                        </Flex>
                    </Box>

                    {/* Content */}
                    <Box p="4" overflow="auto" maxH="320px">
                        <Stack spacing={4}>
                            {/* Year Selection */}
                            <Box>
                                <Text fontSize="sm" fontWeight="medium" mb={2}>
                                    Select Year:
                                </Text>
                                <SimpleGrid columns={4} spacing={2}>
                                    {years.map(year => {
                                        const isSelected = selectedYear === year
                                        const isCurrent = year === currentYear
                                        return (
                                            <Button
                                                key={year}
                                                size="sm"
                                                variant={isSelected ? "solid" : "outline"}
                                                colorScheme={isSelected ? "blue" : "gray"}
                                                onClick={() => setSelectedYear(year)}
                                                borderWidth={isCurrent ? "2px" : "1px"}
                                                borderColor={isCurrent ? "green.400" : undefined}
                                            >
                                                {year}
                                                {isCurrent && (
                                                    <Badge ml={1} fontSize="6px" colorScheme="green">
                                                        NOW
                                                    </Badge>
                                                )}
                                            </Button>
                                        )
                                    })}
                                </SimpleGrid>
                            </Box>

                            {/* Month Selection */}
                            {selectedYear && (
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" mb={2}>
                                        Select Month:
                                    </Text>
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
                                                        {isCurrent && (
                                                            <Badge ml={1} fontSize="6px" colorScheme="green">
                                                                NOW
                                                            </Badge>
                                                        )}
                                                    </Button>
                                                </Tooltip>
                                            )
                                        })}
                                    </SimpleGrid>
                                </Box>
                            )}

                            {/* Helper Text */}
                            <Text fontSize="xs" color="gray.500" textAlign="center">
                                DHIS2 format: YYYYMM (e.g., 202501 for January 2025)
                            </Text>
                        </Stack>
                    </Box>
                </Box>
            )}
        </Stack>
    )
}

export default DQPeriodPicker
