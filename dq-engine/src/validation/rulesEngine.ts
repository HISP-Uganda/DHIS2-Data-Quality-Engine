/**
 * Advanced Validation Rules Engine
 * Supports range, consistency, outlier, and mandatory field validations
 */

import { getDb } from '../db/connection'

export type RuleType = 'range' | 'consistency' | 'outlier' | 'mandatory'
export type Severity = 'error' | 'warning' | 'info'

export interface ValidationRule {
    id: string
    name: string
    description?: string
    ruleType: RuleType
    dataElements: string[]
    condition?: string  // Expression like "DE1 + DE2 == DE3"
    threshold?: number
    severity: Severity
    datasetId?: string
    orgUnitLevels?: number[]
    isActive: boolean
    createdAt: string
    updatedAt: string
    createdBy?: string
}

export interface ValidationResult {
    ruleId: string
    ruleName: string
    ruleType: RuleType
    severity: Severity
    passed: boolean
    message: string
    dataElement?: string
    value?: string | number
    expectedValue?: string | number
    suggestedFix?: string
}

export interface DataValue {
    dataElement: string
    value: string | number
    period: string
    orgUnit: string
}

/**
 * Save a validation rule to database
 */
export function saveValidationRule(rule: Omit<ValidationRule, 'id' | 'createdAt' | 'updatedAt'>): ValidationRule {
    const db = getDb()
    const { v4: uuidv4 } = require('uuid')

    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = db.prepare(`
        INSERT INTO validation_rules (
            id, name, description, rule_type, data_elements,
            condition, threshold, severity, dataset_id, org_unit_levels,
            is_active, created_at, updated_at, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
        id,
        rule.name,
        rule.description || null,
        rule.ruleType,
        JSON.stringify(rule.dataElements),
        rule.condition || null,
        rule.threshold || null,
        rule.severity,
        rule.datasetId || null,
        rule.orgUnitLevels ? JSON.stringify(rule.orgUnitLevels) : null,
        rule.isActive ? 1 : 0,
        now,
        now,
        rule.createdBy || null
    )

    return {
        id,
        ...rule,
        createdAt: now,
        updatedAt: now
    }
}

/**
 * Get all active validation rules
 */
export function getActiveRules(datasetId?: string): ValidationRule[] {
    const db = getDb()

    let query = `
        SELECT * FROM validation_rules
        WHERE is_active = 1
    `
    const params: any[] = []

    if (datasetId) {
        query += ` AND (dataset_id = ? OR dataset_id IS NULL)`
        params.push(datasetId)
    }

    query += ` ORDER BY severity DESC, name ASC`

    const stmt = db.prepare(query)
    const rows = stmt.all(...params) as any[]

    return rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        ruleType: row.rule_type as RuleType,
        dataElements: JSON.parse(row.data_elements),
        condition: row.condition,
        threshold: row.threshold,
        severity: row.severity as Severity,
        datasetId: row.dataset_id,
        orgUnitLevels: row.org_unit_levels ? JSON.parse(row.org_unit_levels) : undefined,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by
    }))
}

/**
 * Range validation: Check if value is within acceptable range
 */
function validateRange(
    rule: ValidationRule,
    dataValue: DataValue,
    allValues: DataValue[]
): ValidationResult {
    const numValue = Number(dataValue.value)

    if (isNaN(numValue)) {
        return {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: 'range',
            severity: rule.severity,
            passed: false,
            message: `Value "${dataValue.value}" is not a number`,
            dataElement: dataValue.dataElement,
            value: dataValue.value,
            suggestedFix: 'Enter a valid numeric value'
        }
    }

    // Check for negative values (usually invalid in health data)
    if (numValue < 0) {
        return {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: 'range',
            severity: 'error',
            passed: false,
            message: `Negative value detected: ${numValue}`,
            dataElement: dataValue.dataElement,
            value: numValue,
            suggestedFix: 'Remove negative sign or verify the value'
        }
    }

    // Check against threshold if provided
    if (rule.threshold !== undefined && numValue > rule.threshold) {
        return {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: 'range',
            severity: rule.severity,
            passed: false,
            message: `Value ${numValue} exceeds threshold of ${rule.threshold}`,
            dataElement: dataValue.dataElement,
            value: numValue,
            expectedValue: rule.threshold,
            suggestedFix: `Verify if value greater than ${rule.threshold} is correct`
        }
    }

    return {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: 'range',
        severity: rule.severity,
        passed: true,
        message: 'Value is within acceptable range',
        dataElement: dataValue.dataElement,
        value: numValue
    }
}

/**
 * Consistency validation: Check if related data elements are consistent
 * Example: Total Births = Live Births + Still Births
 */
function validateConsistency(
    rule: ValidationRule,
    dataValue: DataValue,
    allValues: DataValue[]
): ValidationResult {
    if (!rule.condition) {
        return {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: 'consistency',
            severity: 'error',
            passed: false,
            message: 'No consistency condition defined',
            dataElement: dataValue.dataElement
        }
    }

    try {
        // Parse condition like "DE1 + DE2 == DE3"
        // Build value map
        const valueMap: { [key: string]: number } = {}

        rule.dataElements.forEach((de, index) => {
            const key = `DE${index + 1}`
            const value = allValues.find(v =>
                v.dataElement === de &&
                v.period === dataValue.period &&
                v.orgUnit === dataValue.orgUnit
            )
            valueMap[key] = value ? Number(value.value) : 0
        })

        // Evaluate condition (simple implementation for common patterns)
        const condition = rule.condition
        let passed = false
        let expectedValue: number | undefined

        // Pattern: DE1 + DE2 == DE3
        const additionMatch = condition.match(/DE(\d+)\s*\+\s*DE(\d+)\s*==\s*DE(\d+)/)
        if (additionMatch) {
            const left = valueMap[`DE${additionMatch[1]}`] + valueMap[`DE${additionMatch[2]}`]
            const right = valueMap[`DE${additionMatch[3]}`]
            passed = Math.abs(left - right) < 0.01 // Allow for rounding
            expectedValue = left
        }

        // Pattern: DE1 - DE2 == DE3
        const subtractionMatch = condition.match(/DE(\d+)\s*-\s*DE(\d+)\s*==\s*DE(\d+)/)
        if (subtractionMatch) {
            const left = valueMap[`DE${subtractionMatch[1]}`] - valueMap[`DE${subtractionMatch[2]}`]
            const right = valueMap[`DE${subtractionMatch[3]}`]
            passed = Math.abs(left - right) < 0.01
            expectedValue = left
        }

        // Pattern: DE1 <= DE2
        const lessThanMatch = condition.match(/DE(\d+)\s*<=\s*DE(\d+)/)
        if (lessThanMatch) {
            const left = valueMap[`DE${lessThanMatch[1]}`]
            const right = valueMap[`DE${lessThanMatch[2]}`]
            passed = left <= right
        }

        return {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: 'consistency',
            severity: rule.severity,
            passed,
            message: passed
                ? `Consistency check passed: ${condition}`
                : `Consistency check failed: ${condition}`,
            dataElement: dataValue.dataElement,
            value: Number(dataValue.value),
            expectedValue,
            suggestedFix: !passed && expectedValue !== undefined
                ? `Expected value: ${expectedValue.toFixed(0)}`
                : undefined
        }
    } catch (error) {
        return {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: 'consistency',
            severity: 'error',
            passed: false,
            message: `Error evaluating condition: ${error}`,
            dataElement: dataValue.dataElement
        }
    }
}

/**
 * Outlier detection: Check if value is statistical outlier
 * Uses Z-score method (> 3 standard deviations from mean)
 */
function validateOutlier(
    rule: ValidationRule,
    dataValue: DataValue,
    allValues: DataValue[],
    historicalData?: DataValue[]
): ValidationResult {
    const numValue = Number(dataValue.value)

    if (isNaN(numValue)) {
        return {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: 'outlier',
            severity: rule.severity,
            passed: true,
            message: 'Non-numeric value, outlier check skipped',
            dataElement: dataValue.dataElement
        }
    }

    // Get values for the same data element from same org unit (historical or current batch)
    const dataSource = historicalData && historicalData.length > 0 ? historicalData : allValues
    const sameElementValues = dataSource
        .filter(v =>
            v.dataElement === dataValue.dataElement &&
            v.orgUnit === dataValue.orgUnit &&
            !isNaN(Number(v.value))
        )
        .map(v => Number(v.value))

    // Need at least 3 values for statistical analysis
    if (sameElementValues.length < 3) {
        return {
            ruleId: rule.id,
            ruleName: rule.name,
            ruleType: 'outlier',
            severity: rule.severity,
            passed: true,
            message: 'Insufficient data for outlier detection',
            dataElement: dataValue.dataElement,
            value: numValue
        }
    }

    // Calculate mean and standard deviation
    const mean = sameElementValues.reduce((a, b) => a + b, 0) / sameElementValues.length
    const variance = sameElementValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sameElementValues.length
    const stdDev = Math.sqrt(variance)

    // Calculate Z-score
    const zScore = stdDev === 0 ? 0 : Math.abs((numValue - mean) / stdDev)

    // Threshold: 3 standard deviations (99.7% confidence)
    const threshold = rule.threshold || 3
    const passed = zScore <= threshold

    return {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: 'outlier',
        severity: rule.severity,
        passed,
        message: passed
            ? `Value is within normal range (Z-score: ${zScore.toFixed(2)})`
            : `Potential outlier detected (Z-score: ${zScore.toFixed(2)}, threshold: ${threshold})`,
        dataElement: dataValue.dataElement,
        value: numValue,
        expectedValue: mean,
        suggestedFix: !passed
            ? `Mean value for this data element is ${mean.toFixed(1)}. Verify if ${numValue} is correct.`
            : undefined
    }
}

/**
 * Mandatory validation: Check if required field has a value
 */
function validateMandatory(
    rule: ValidationRule,
    dataValue: DataValue,
    allValues: DataValue[]
): ValidationResult {
    const isEmpty =
        dataValue.value === null ||
        dataValue.value === undefined ||
        dataValue.value === '' ||
        (typeof dataValue.value === 'string' && dataValue.value.trim() === '')

    return {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: 'mandatory',
        severity: rule.severity,
        passed: !isEmpty,
        message: isEmpty
            ? 'Required field is empty'
            : 'Required field has a value',
        dataElement: dataValue.dataElement,
        value: dataValue.value,
        suggestedFix: isEmpty ? 'Enter a value for this required field' : undefined
    }
}

/**
 * Run validation on a set of data values
 */
export function runValidation(
    dataValues: DataValue[],
    datasetId?: string,
    historicalData?: DataValue[]
): ValidationResult[] {
    const results: ValidationResult[] = []
    const rules = getActiveRules(datasetId)

    console.log(`[Validation] Running ${rules.length} validation rules on ${dataValues.length} data values`)

    for (const rule of rules) {
        // Find data values relevant to this rule
        const relevantValues = dataValues.filter(dv =>
            rule.dataElements.includes(dv.dataElement)
        )

        for (const dataValue of relevantValues) {
            let result: ValidationResult

            switch (rule.ruleType) {
                case 'range':
                    result = validateRange(rule, dataValue, dataValues)
                    break
                case 'consistency':
                    result = validateConsistency(rule, dataValue, dataValues)
                    break
                case 'outlier':
                    result = validateOutlier(rule, dataValue, dataValues, historicalData)
                    break
                case 'mandatory':
                    result = validateMandatory(rule, dataValue, dataValues)
                    break
                default:
                    result = {
                        ruleId: rule.id,
                        ruleName: rule.name,
                        ruleType: rule.ruleType,
                        severity: rule.severity,
                        passed: true,
                        message: 'Unknown rule type',
                        dataElement: dataValue.dataElement
                    }
            }

            results.push(result)
        }
    }

    const failures = results.filter(r => !r.passed)
    console.log(`[Validation] Completed: ${results.length} checks, ${failures.length} failures`)

    return results
}

/**
 * Create default validation rules for health data
 */
export function createDefaultRules(): ValidationRule[] {
    const rules: Omit<ValidationRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
            name: 'No Negative Values',
            description: 'Health data values should not be negative',
            ruleType: 'range',
            dataElements: [], // Applied to all
            severity: 'error',
            isActive: true
        },
        {
            name: 'Total Births Consistency',
            description: 'Total births should equal live births + still births',
            ruleType: 'consistency',
            dataElements: ['LIVE_BIRTHS_ID', 'STILL_BIRTHS_ID', 'TOTAL_BIRTHS_ID'], // Replace with actual IDs
            condition: 'DE1 + DE2 == DE3',
            severity: 'error',
            isActive: false // Disabled by default, user needs to configure with actual IDs
        },
        {
            name: 'Outlier Detection',
            description: 'Flag values that deviate significantly from historical patterns',
            ruleType: 'outlier',
            dataElements: [], // Applied to all numeric values
            threshold: 3, // 3 standard deviations
            severity: 'warning',
            isActive: true
        }
    ]

    return rules.map(rule => saveValidationRule(rule))
}
