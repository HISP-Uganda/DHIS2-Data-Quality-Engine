import React, { useState, useEffect } from 'react'
import {
    Box, VStack, Input, InputGroup, InputLeftElement, Text, Alert, AlertIcon,
    FormControl, FormLabel, Spinner, Badge
} from '@chakra-ui/react'
import { FaSearch } from 'react-icons/fa'
import { Tree } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { OrgUnitTreeNode } from '../api'

interface OrgUnitTreeSelectorProps {
    treeData: OrgUnitTreeNode[]
    selectedOrgUnits: string[]
    selectedOrgNames: string[]
    onSelectionChange: (selectedIds: string[], selectedNames: string[]) => void
    label?: string
    placeholder?: string
    isLoading?: boolean
    maxHeight?: string
    multiple?: boolean
}

// Helper function to convert OrgUnitTreeNode to Ant Design DataNode
const convertToAntTreeData = (nodes: OrgUnitTreeNode[]): DataNode[] => {
    return nodes.map(node => ({
        key: node.id,
        title: node.title,
        children: node.children ? convertToAntTreeData(node.children) : []
    }))
}

// Helper function to filter tree nodes based on search term
const filterTreeNodes = (nodes: OrgUnitTreeNode[], searchTerm: string): OrgUnitTreeNode[] => {
    if (!searchTerm) return nodes

    const filteredNodes: OrgUnitTreeNode[] = []

    for (const node of nodes) {
        if (node.title.toLowerCase().includes(searchTerm.toLowerCase())) {
            // If current node matches, include it with all its children
            filteredNodes.push(node)
        } else if (node.children && node.children.length > 0) {
            // If current node doesn't match, check its children
            const filteredChildren = filterTreeNodes(node.children, searchTerm)
            if (filteredChildren.length > 0) {
                // If any children match, include current node with filtered children
                filteredNodes.push({
                    ...node,
                    children: filteredChildren
                })
            }
        }
    }

    return filteredNodes
}

// Helper function to find node names by IDs
const findNodeNames = (nodes: OrgUnitTreeNode[], selectedIds: string[]): string[] => {
    const names: string[] = []
    
    const findNamesRecursive = (currentNodes: OrgUnitTreeNode[]) => {
        for (const node of currentNodes) {
            if (selectedIds.includes(node.id)) {
                names.push(node.title)
            }
            if (node.children) {
                findNamesRecursive(node.children)
            }
        }
    }
    
    findNamesRecursive(nodes)
    return names
}

export default function OrgUnitTreeSelector({
    treeData,
    selectedOrgUnits,
    selectedOrgNames,
    onSelectionChange,
    label = "Organization Units",
    placeholder = "Search organization units...",
    isLoading = false,
    maxHeight = "300px",
    multiple = true
}: OrgUnitTreeSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedKeys, setExpandedKeys] = useState<string[]>([])

    // Auto-expand keys based on search or selection
    useEffect(() => {
        if (searchTerm || selectedOrgUnits.length > 0) {
            // Expand all nodes that contain search term or selected units
            const keysToExpand: string[] = []
            
            const expandNodesRecursive = (nodes: OrgUnitTreeNode[], parentKey?: string) => {
                for (const node of nodes) {
                    const shouldExpand = searchTerm ? 
                        node.title.toLowerCase().includes(searchTerm.toLowerCase()) :
                        selectedOrgUnits.includes(node.id)
                    
                    if (shouldExpand && parentKey) {
                        keysToExpand.push(parentKey)
                    }
                    
                    if (node.children) {
                        expandNodesRecursive(node.children, node.id)
                    }
                }
            }
            
            expandNodesRecursive(treeData)
            setExpandedKeys(keysToExpand)
        }
    }, [searchTerm, selectedOrgUnits, treeData])

    const handleSelectionChange = (checkedKeys: any) => {
        const selectedIds = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked || []
        const selectedNames = findNodeNames(treeData, selectedIds)
        onSelectionChange(selectedIds, selectedNames)
    }

    if (treeData.length === 0 && !isLoading) {
        return (
            <FormControl>
                <FormLabel>{label}</FormLabel>
                <Alert status="info" size="sm">
                    <AlertIcon />
                    <Text fontSize="sm">
                        No organization unit data available for this configuration.
                    </Text>
                </Alert>
            </FormControl>
        )
    }

    return (
        <FormControl>
            <FormLabel>{label}</FormLabel>
            <VStack spacing={3} align="stretch">
                {/* Search Input */}
                <InputGroup size="sm">
                    <InputLeftElement>
                        <FaSearch color="gray.400" />
                    </InputLeftElement>
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={placeholder}
                    />
                </InputGroup>

                {/* Selected Units Display */}
                {selectedOrgUnits.length > 0 && (
                    <Box>
                        <Text fontSize="xs" color="gray.600" mb={1}>
                            Selected ({selectedOrgUnits.length}):
                        </Text>
                        <Box maxH="60px" overflowY="auto">
                            {selectedOrgNames.map((name, index) => (
                                <Badge key={index} colorScheme="blue" size="sm" mr={1} mb={1}>
                                    {name}
                                </Badge>
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Tree Selector */}
                <Box
                    border="1px"
                    borderColor="gray.200" 
                    borderRadius="md"
                    maxH={maxHeight}
                    overflowY="auto"
                    p={2}
                >
                    {isLoading ? (
                        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                            <Spinner size="sm" mr={2} />
                            <Text fontSize="sm" color="gray.600">Loading organization units...</Text>
                        </Box>
                    ) : (
                        <Tree
                            treeData={convertToAntTreeData(filterTreeNodes(treeData, searchTerm))}
                            checkable={multiple}
                            checkedKeys={selectedOrgUnits}
                            expandedKeys={expandedKeys}
                            onExpand={(keys) => setExpandedKeys(keys as string[])}
                            onCheck={handleSelectionChange}
                            showLine={{ showLeafIcon: false }}
                            height={parseInt(maxHeight) - 20}
                            style={{ fontSize: '12px' }}
                        />
                    )}
                </Box>

                {!multiple && selectedOrgUnits.length > 1 && (
                    <Alert status="warning" size="sm">
                        <AlertIcon />
                        <Text fontSize="xs">
                            Single selection mode: Only one organization unit can be selected.
                        </Text>
                    </Alert>
                )}
            </VStack>
        </FormControl>
    )
}