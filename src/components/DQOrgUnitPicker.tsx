import React, { useRef } from "react";
import {
    Stack,
    Button,
    Text,
    useDisclosure,
    useOutsideClick,
    Box,
    Flex,
    Badge,
    Tooltip,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import OrgUnitTreeSelector from './OrgUnitTreeSelector';
import { OrgUnitTreeNode } from '../api';

interface DQOrgUnitPickerProps {
    treeData: OrgUnitTreeNode[];
    selectedOrgUnits: string[];
    selectedOrgNames: string[];
    onSelectionChange: (selectedIds: string[], selectedNames: string[]) => void;
    label?: string;
    isDisabled?: boolean;
    isLoading?: boolean;
    multiple?: boolean;
}

export default function DQOrgUnitPicker({
    treeData,
    selectedOrgUnits,
    selectedOrgNames,
    onSelectionChange,
    label = "Organisation Unit",
    isDisabled = false,
    isLoading = false,
    multiple = true
}: DQOrgUnitPickerProps) {
    const { isOpen, onToggle, onClose } = useDisclosure();
    const ref = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useOutsideClick({ ref: ref as React.RefObject<HTMLDivElement>, handler: onClose });

    const MAX_VISIBLE = 3;
    const visibleNames = selectedOrgNames.slice(0, MAX_VISIBLE);
    const hiddenNames = selectedOrgNames.slice(MAX_VISIBLE);
    const hasHidden = hiddenNames.length > 0;
    const hiddenTooltip = hiddenNames.join(", ");

    const getModalPosition = () => {
        if (buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const modalWidth = 500;
            const modalHeight = 450;

            let top = buttonRect.bottom + 8;
            let left = buttonRect.left;

            // Adjust if modal would go off the right edge of screen
            if (left + modalWidth > window.innerWidth) {
                left = window.innerWidth - modalWidth - 16;
            }

            // Adjust if modal would go off the bottom edge of screen
            if (top + modalHeight > window.innerHeight) {
                top = buttonRect.top - modalHeight - 8;
            }

            // Ensure minimum margins
            left = Math.max(16, left);
            top = Math.max(16, top);

            return { top, left };
        }
        return { top: "50%", left: "50%" };
    };

    const getButtonText = () => {
        if (isLoading) return "Loading...";
        if (selectedOrgUnits.length === 0) return label;
        if (!multiple && selectedOrgNames.length > 0) return selectedOrgNames[0];
        return `${selectedOrgUnits.length} selected`;
    };

    const visibleBadges: React.ReactNode[] = visibleNames.map((name, idx) => (
        <Tooltip key={idx} label={name} hasArrow>
            <Badge
                colorScheme="green"
                variant="subtle"
                px={2}
                py={1}
                mr={2}
                maxW="120px"
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
            >
                {name}
            </Badge>
        </Tooltip>
    ));

    const hiddenBadge = hasHidden ? (
        <Tooltip label={hiddenTooltip} hasArrow>
            <Badge
                colorScheme="gray"
                variant="outline"
                px={2}
                py={1}
                title={hiddenTooltip}
            >
                +{hiddenNames.length} more
            </Badge>
        </Tooltip>
    ) : null;

    return (
        <Stack position="relative" flex={1} spacing={1}>
            <Flex align="center">
                <Button
                    ref={buttonRef}
                    onClick={onToggle}
                    w="200px"
                    size="md"
                    variant="outline"
                    colorScheme={selectedOrgUnits.length > 0 ? "green" : "blue"}
                    _hover={{
                        bg: selectedOrgUnits.length > 0 ? "green.50" : "blue.50"
                    }}
                    isDisabled={isDisabled || isLoading}
                    justifyContent="space-between"
                    rightIcon={
                        <ChevronDownIcon
                            transform={isOpen ? "rotate(180deg)" : "rotate(0deg)"}
                            transition="transform 0.2s"
                        />
                    }
                >
                    <Flex align="center" flex={1} minW={0}>
                        {selectedOrgUnits.length > 0 && multiple && (
                            <Badge
                                colorScheme="green"
                                size="sm"
                                mr={2}
                                borderRadius="full"
                                px={2}
                            >
                                {selectedOrgUnits.length}
                            </Badge>
                        )}
                        <Text
                            fontSize="sm"
                            whiteSpace="nowrap"
                            overflow="hidden"
                            textOverflow="ellipsis"
                            flex={1}
                            fontWeight={selectedOrgUnits.length > 0 ? "medium" : "normal"}
                        >
                            {getButtonText()}
                        </Text>
                    </Flex>
                </Button>

                {multiple && (
                    <Flex
                        ml={2}
                        wrap="nowrap"
                        overflow="hidden"
                        align="center"
                        flex="1"
                        minW={0}
                    >
                        {visibleBadges}
                        {hiddenBadge}
                    </Flex>
                )}

                {!multiple && selectedOrgNames.length > 0 && (
                    <Badge ml={2} colorScheme="green" px={2} py={1}>
                        {selectedOrgNames[0]}
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
                    w="500px"
                    maxH="450px"
                    zIndex={10000}
                    overflow="hidden"
                >
                    <Box px="3" py="2" textAlign="right" borderBottom="1px solid" borderColor="gray.200" bg="gray.50">
                        <Text fontSize="md" fontWeight="semibold" float="left" mt="1">
                            Select {label}
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

                    {!multiple && (
                        <Box px="3" py="2" bg="blue.50" borderBottom="1px solid" borderColor="blue.200">
                            <Text fontSize="sm" color="blue.700">
                                ℹ️ Single selection mode. Select one organisation unit.
                            </Text>
                        </Box>
                    )}

                    <Box p="3" overflow="auto" maxH="350px">
                        <OrgUnitTreeSelector
                            treeData={treeData}
                            selectedOrgUnits={selectedOrgUnits}
                            selectedOrgNames={selectedOrgNames}
                            onSelectionChange={onSelectionChange}
                            label=""
                            isLoading={isLoading}
                            maxHeight="300px"
                            multiple={multiple}
                        />
                    </Box>

                    <Box px="3" py="2" borderTop="1px solid" borderColor="gray.200" bg="gray.50" textAlign="right">
                        <Button
                            size="sm"
                            colorScheme="blue"
                            onClick={onClose}
                            mr={2}
                        >
                            Update
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                    </Box>
                </Box>
            )}
        </Stack>
    );
}
