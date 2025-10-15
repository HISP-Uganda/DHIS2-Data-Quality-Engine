/**
 * Audit Logging Utility
 * Tracks all important actions in the system for compliance and debugging
 */

import { getDb } from '../db/connection'
import { v4 as uuidv4 } from 'uuid'

export type AuditAction =
    // Configuration actions
    | 'config.create'
    | 'config.update'
    | 'config.delete'
    | 'config.toggle'
    // Schedule actions
    | 'schedule.create'
    | 'schedule.update'
    | 'schedule.delete'
    | 'schedule.run'
    // DQ run actions
    | 'dq.run.start'
    | 'dq.run.success'
    | 'dq.run.failure'
    // Comparison actions
    | 'comparison.start'
    | 'comparison.complete'
    // Facility actions
    | 'facility.create'
    | 'facility.update'
    | 'facility.delete'
    // Notification actions
    | 'notification.sent'
    | 'notification.failed'
    // Validation actions
    | 'validation.rule.create'
    | 'validation.rule.update'
    | 'validation.rule.delete'
    // System actions
    | 'system.startup'
    | 'system.shutdown'
    | 'system.backup'

export interface AuditLogEntry {
    id: string
    userId?: string
    userEmail?: string
    action: AuditAction
    resourceType: string
    resourceId?: string
    changes?: any
    ipAddress?: string
    userAgent?: string
    createdAt: string
}

/**
 * Log an audit event
 */
export function logAudit(params: {
    action: AuditAction
    resourceType: string
    resourceId?: string
    userId?: string
    userEmail?: string
    changes?: any
    ipAddress?: string
    userAgent?: string
}): AuditLogEntry {
    const db = getDb()

    const id = uuidv4()
    const now = new Date().toISOString()

    const stmt = db.prepare(`
        INSERT INTO audit_logs (
            id, user_id, user_email, action, resource_type, resource_id,
            changes, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
        id,
        params.userId || null,
        params.userEmail || null,
        params.action,
        params.resourceType,
        params.resourceId || null,
        params.changes ? JSON.stringify(params.changes) : null,
        params.ipAddress || null,
        params.userAgent || null,
        now
    )

    console.log(`[Audit] ${params.action} on ${params.resourceType}${params.resourceId ? ` (${params.resourceId})` : ''} by ${params.userId || params.userEmail || 'system'}`)

    return {
        id,
        userId: params.userId,
        userEmail: params.userEmail,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        changes: params.changes,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        createdAt: now
    }
}

/**
 * Get audit logs with filters
 */
export function getAuditLogs(params?: {
    userId?: string
    resourceType?: string
    resourceId?: string
    action?: AuditAction
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
}): AuditLogEntry[] {
    const db = getDb()

    let query = 'SELECT * FROM audit_logs WHERE 1=1'
    const queryParams: any[] = []

    if (params?.userId) {
        query += ' AND user_id = ?'
        queryParams.push(params.userId)
    }

    if (params?.resourceType) {
        query += ' AND resource_type = ?'
        queryParams.push(params.resourceType)
    }

    if (params?.resourceId) {
        query += ' AND resource_id = ?'
        queryParams.push(params.resourceId)
    }

    if (params?.action) {
        query += ' AND action = ?'
        queryParams.push(params.action)
    }

    if (params?.startDate) {
        query += ' AND created_at >= ?'
        queryParams.push(params.startDate)
    }

    if (params?.endDate) {
        query += ' AND created_at <= ?'
        queryParams.push(params.endDate)
    }

    query += ' ORDER BY created_at DESC'

    if (params?.limit) {
        query += ' LIMIT ?'
        queryParams.push(params.limit)
    }

    if (params?.offset) {
        query += ' OFFSET ?'
        queryParams.push(params.offset)
    }

    const stmt = db.prepare(query)
    const rows = stmt.all(...queryParams) as any[]

    return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        userEmail: row.user_email,
        action: row.action as AuditAction,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        changes: row.changes ? JSON.parse(row.changes) : undefined,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        createdAt: row.created_at
    }))
}

/**
 * Get audit log statistics
 */
export function getAuditStats(params?: {
    startDate?: string
    endDate?: string
}): {
    totalEvents: number
    eventsByAction: { action: string; count: number }[]
    eventsByUser: { userId: string; userEmail: string; count: number }[]
    eventsByResourceType: { resourceType: string; count: number }[]
} {
    const db = getDb()

    let whereClause = 'WHERE 1=1'
    const queryParams: any[] = []

    if (params?.startDate) {
        whereClause += ' AND created_at >= ?'
        queryParams.push(params.startDate)
    }

    if (params?.endDate) {
        whereClause += ' AND created_at <= ?'
        queryParams.push(params.endDate)
    }

    // Total events
    const totalStmt = db.prepare(`SELECT COUNT(*) as count FROM audit_logs ${whereClause}`)
    const totalResult = totalStmt.get(...queryParams) as { count: number }

    // Events by action
    const actionStmt = db.prepare(`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        ${whereClause}
        GROUP BY action
        ORDER BY count DESC
    `)
    const actionResults = actionStmt.all(...queryParams) as Array<{ action: string; count: number }>

    // Events by user
    const userStmt = db.prepare(`
        SELECT user_id as userId, user_email as userEmail, COUNT(*) as count
        FROM audit_logs
        ${whereClause}
        AND (user_id IS NOT NULL OR user_email IS NOT NULL)
        GROUP BY user_id, user_email
        ORDER BY count DESC
        LIMIT 10
    `)
    const userResults = userStmt.all(...queryParams) as Array<{ userId: string; userEmail: string; count: number }>

    // Events by resource type
    const resourceStmt = db.prepare(`
        SELECT resource_type as resourceType, COUNT(*) as count
        FROM audit_logs
        ${whereClause}
        GROUP BY resource_type
        ORDER BY count DESC
    `)
    const resourceResults = resourceStmt.all(...queryParams) as Array<{ resourceType: string; count: number }>

    return {
        totalEvents: totalResult.count,
        eventsByAction: actionResults,
        eventsByUser: userResults,
        eventsByResourceType: resourceResults
    }
}

/**
 * Get activity timeline for a specific resource
 */
export function getResourceTimeline(resourceType: string, resourceId: string): AuditLogEntry[] {
    return getAuditLogs({
        resourceType,
        resourceId,
        limit: 50
    })
}

/**
 * Clean up old audit logs (retention policy)
 */
export function cleanupOldLogs(retentionDays: number = 90): number {
    const db = getDb()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const stmt = db.prepare(`
        DELETE FROM audit_logs
        WHERE created_at < ?
    `)

    const result = stmt.run(cutoffDate.toISOString())

    console.log(`[Audit] Cleaned up ${result.changes} audit logs older than ${retentionDays} days`)

    return result.changes
}

/**
 * Export audit logs as JSON
 */
export function exportAuditLogs(params?: {
    startDate?: string
    endDate?: string
    format?: 'json' | 'csv'
}): string {
    const logs = getAuditLogs({
        startDate: params?.startDate,
        endDate: params?.endDate
    })

    if (params?.format === 'csv') {
        // CSV export
        const headers = ['ID', 'Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address']
        const rows = logs.map(log => [
            log.id,
            log.createdAt,
            log.userEmail || log.userId || 'system',
            log.action,
            log.resourceType,
            log.resourceId || '',
            log.ipAddress || ''
        ])

        return [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')
    }

    // JSON export (default)
    return JSON.stringify(logs, null, 2)
}

/**
 * Helper: Create audit middleware for Express
 */
export function createAuditMiddleware() {
    return (req: any, res: any, next: any) => {
        // Attach audit logger to request
        req.audit = (action: AuditAction, resourceType: string, resourceId?: string, changes?: any) => {
            logAudit({
                action,
                resourceType,
                resourceId,
                userId: req.user?.id,
                userEmail: req.user?.email,
                changes,
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent']
            })
        }

        next()
    }
}
