export interface ComparisonConfiguration {
  id: string
  name: string
  description?: string

  sourceUrl: string
  sourceUser: string
  sourcePass: string
  selectedSourceDataset: string
  selectedSourceOrgUnits: string[]
  selectedSourceOrgNames: string[]
  selectedDataElements: string[]
  period: string | string[]

  destinationUrl: string
  destinationUser: string
  destinationPass: string
  selectedDestDataset: string
  selectedDestOrgUnits: string[]
  selectedDestOrgNames: string[]
  dataElementMapping: string

  sourceOrgUnitTree?: OrgUnitTreeNode[]
  destinationOrgUnitTree?: OrgUnitTreeNode[]

  selectedDatasets: string[]
  dataElementGroups: DataElementGroup[]

  createdAt: string
  updatedAt: string
  lastRunAt?: string
  isActive: boolean
}

export interface DQRunConfiguration {
  id: string
  name: string
  description?: string
  type: 'dq-run'

  sourceUrl: string
  sourceUser: string
  sourcePass: string
  dataElements: string[]
  datasetDC: string

  destinationUrl?: string
  destinationUser?: string
  destinationPass?: string
  destinationDataset?: string
  dataElementMapping?: Record<string, string>

  createdAt: string
  updatedAt: string
  lastRunAt?: string
  isActive: boolean
}

export interface DataElementGroup {
  id: string
  logicalName: string
  elements: {
    [datasetId: string]: {
      id: string
      displayName: string
      datasetId: string
      datasetName: string
    } | null
  }
}

export interface OrgUnitTreeNode {
  key: string
  value: string
  title: string
  id: string
  level: number
  children: OrgUnitTreeNode[]
}

export interface SavedConfigurationSummary {
  id: string
  name: string
  description?: string
  datasetCount: number
  groupCount: number
  createdAt: string
  lastRunAt?: string
  isActive: boolean
}

export interface DataQualityDimension {
  name: string
  description: string
  numerator: number
  denominator: number
  percentage: number
  status: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface DashboardMetrics {
  totalDQRuns: number
  successfulRuns: number
  totalValidationErrors: number
  totalDatasetComparisons: number
  averageCompleteness: number
  consensusPercentage: number
  activeDQJobs: number
  lastRunTime: string | null
  recentErrors: any[]
  facilityStats: any[]
  regionalStats: Array<{
    region: string
    completeness: number
    facilities: number
  }>
  trendsData: Array<{
    period: string
    completeness: number
    accuracy: number
  }>
  dataQualityDimensions: {
    completenessOfSourceRegister: DataQualityDimension
    availabilityOfReportedData: DataQualityDimension
    accuracyOfReportedData: DataQualityDimension
    internalConsistency: DataQualityDimension
  }
}