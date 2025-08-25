export interface DQRunResult {
    success: boolean
    summary: {
        recordsProcessed: number
        issuesFound: number
        period: string
        orgUnit: string
        dataElements: number
        destinationPosted: number
    }
    results?: Array<{
        dataElement: string
        value: string
        issues: string[]
    }>
    error?: string
}

export interface ComparisonResult {
    datasets: Array<{ id: string; name: string }>
    comparisonResults: Array<{
        dataElement: string
        dataElementName: string
        orgUnit: string
        orgUnitName: string
        period: string
        status: 'match' | 'mismatch' | 'missing'
        conflicts: string[]
    }>
    summary: {
        totalRecords: number
        matchingRecords: number
        mismatchedRecords: number
        missingRecords: number
    }
}

export interface FacilityInfo {
    name: string
    orgUnitId: string
    contacts: {
        email?: string[]
        whatsapp?: string[]
        sms?: string[]
    }
}

export class NotificationTemplates {
    static generateDQRunEmailSubject(facility: FacilityInfo, result: DQRunResult): string {
        const status = result.success ? '✅ Completed' : '❌ Failed'
        return `Data Quality Report ${status} - ${facility.name} (${result.summary?.period || 'Unknown Period'})`
    }

    static generateDQRunEmailHTML(facility: FacilityInfo, result: DQRunResult): string {
        const timestamp = new Date().toLocaleString()
        
        if (!result.success) {
            return `
                <html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="background-color: #dc3545; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                                <h2 style="margin: 0;">❌ Data Quality Run Failed</h2>
                            </div>
                            
                            <h3>Facility Information</h3>
                            <p><strong>Facility:</strong> ${facility.name}</p>
                            <p><strong>Organization Unit:</strong> ${facility.orgUnitId}</p>
                            <p><strong>Timestamp:</strong> ${timestamp}</p>
                            
                            <h3>Error Details</h3>
                            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 15px 0;">
                                <p style="margin: 0; font-family: monospace;">${result.error || 'Unknown error occurred'}</p>
                            </div>
                            
                            <p>Please contact your system administrator for assistance.</p>
                            
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
                            <p style="font-size: 12px; color: #6c757d;">
                                This is an automated notification from the DHIS2 Data Quality Engine.
                            </p>
                        </div>
                    </body>
                </html>
            `
        }

        const { summary, results } = result
        const completenessRate = summary.recordsProcessed > 0 
            ? Math.round(((summary.recordsProcessed - summary.issuesFound) / summary.recordsProcessed) * 100)
            : 100
        
        const statusColor = summary.issuesFound === 0 ? '#28a745' : summary.issuesFound <= 5 ? '#ffc107' : '#dc3545'
        const statusIcon = summary.issuesFound === 0 ? '✅' : summary.issuesFound <= 5 ? '⚠️' : '❌'
        
        // Top issues for summary
        const topIssues = results ? 
            results.filter(r => r.issues.length > 0)
                   .slice(0, 5)
                   .map(r => `<li><strong>${r.dataElement}:</strong> ${r.issues.join(', ')}</li>`)
                   .join('') : ''

        return `
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: ${statusColor}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <h2 style="margin: 0;">${statusIcon} Data Quality Report</h2>
                        </div>
                        
                        <h3>Facility Information</h3>
                        <p><strong>Facility:</strong> ${facility.name}</p>
                        <p><strong>Organization Unit:</strong> ${facility.orgUnitId}</p>
                        <p><strong>Period:</strong> ${summary.period}</p>
                        <p><strong>Timestamp:</strong> ${timestamp}</p>
                        
                        <h3>Summary</h3>
                        <div style="display: flex; gap: 15px; margin: 20px 0;">
                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
                                <h4 style="margin: 0 0 10px 0; color: #495057;">Records Processed</h4>
                                <div style="font-size: 24px; font-weight: bold; color: #007bff;">${summary.recordsProcessed}</div>
                            </div>
                            <div style="background-color: ${summary.issuesFound === 0 ? '#d4edda' : '#fff3cd'}; padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
                                <h4 style="margin: 0 0 10px 0; color: #495057;">Issues Found</h4>
                                <div style="font-size: 24px; font-weight: bold; color: ${summary.issuesFound === 0 ? '#155724' : '#856404'};">${summary.issuesFound}</div>
                            </div>
                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; flex: 1; text-align: center;">
                                <h4 style="margin: 0 0 10px 0; color: #495057;">Completeness</h4>
                                <div style="font-size: 24px; font-weight: bold; color: #28a745;">${completenessRate}%</div>
                            </div>
                        </div>
                        
                        <h3>Data Elements Processed</h3>
                        <p>${summary.dataElements} data elements were checked for quality issues.</p>
                        
                        ${summary.destinationPosted > 0 ? `
                            <h3>Data Synchronization</h3>
                            <p style="color: #28a745;">✅ Successfully posted ${summary.destinationPosted} records to destination system.</p>
                        ` : ''}
                        
                        ${topIssues ? `
                            <h3>Top Issues Found</h3>
                            <ul style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                                ${topIssues}
                            </ul>
                        ` : ''}
                        
                        ${summary.issuesFound === 0 ? `
                            <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
                                <strong>🎉 Excellent!</strong> No data quality issues were found in this period.
                            </div>
                        ` : ''}
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
                        <p style="font-size: 12px; color: #6c757d;">
                            This is an automated notification from the DHIS2 Data Quality Engine.<br>
                            Generated at ${timestamp}
                        </p>
                    </div>
                </body>
            </html>
        `
    }

    static generateDQRunEmailText(facility: FacilityInfo, result: DQRunResult): string {
        const timestamp = new Date().toLocaleString()
        
        if (!result.success) {
            return `
DATA QUALITY RUN FAILED

Facility: ${facility.name}
Organization Unit: ${facility.orgUnitId}
Timestamp: ${timestamp}

ERROR: ${result.error || 'Unknown error occurred'}

Please contact your system administrator for assistance.

---
This is an automated notification from the DHIS2 Data Quality Engine.
            `.trim()
        }

        const { summary } = result
        const completenessRate = summary.recordsProcessed > 0 
            ? Math.round(((summary.recordsProcessed - summary.issuesFound) / summary.recordsProcessed) * 100)
            : 100

        return `
DATA QUALITY REPORT

Facility: ${facility.name}
Organization Unit: ${facility.orgUnitId}
Period: ${summary.period}
Timestamp: ${timestamp}

SUMMARY:
- Records Processed: ${summary.recordsProcessed}
- Issues Found: ${summary.issuesFound}
- Data Quality Score: ${completenessRate}%
- Data Elements Checked: ${summary.dataElements}
${summary.destinationPosted > 0 ? `- Records Synchronized: ${summary.destinationPosted}` : ''}

${summary.issuesFound === 0 ? 
    'EXCELLENT! No data quality issues were found in this period.' :
    `${summary.issuesFound} data quality issues require attention.`
}

---
This is an automated notification from the DHIS2 Data Quality Engine.
Generated at ${timestamp}
        `.trim()
    }

    static generateDQRunWhatsApp(facility: FacilityInfo, result: DQRunResult): string {
        const timestamp = new Date().toLocaleString()
        
        if (!result.success) {
            return `❌ *Data Quality Run Failed*\n\n` +
                   `Facility: ${facility.name}\n` +
                   `Period: ${result.summary?.period || 'Unknown'}\n` +
                   `Time: ${timestamp}\n\n` +
                   `Error: ${result.error || 'Unknown error'}\n\n` +
                   `Please contact system administrator.`
        }

        const { summary } = result
        const completenessRate = summary.recordsProcessed > 0 
            ? Math.round(((summary.recordsProcessed - summary.issuesFound) / summary.recordsProcessed) * 100)
            : 100

        const statusIcon = summary.issuesFound === 0 ? '✅' : summary.issuesFound <= 5 ? '⚠️' : '❌'
        
        return `${statusIcon} *Data Quality Report*\n\n` +
               `Facility: ${facility.name}\n` +
               `Period: ${summary.period}\n` +
               `Time: ${timestamp}\n\n` +
               `📊 *Summary:*\n` +
               `• Records: ${summary.recordsProcessed}\n` +
               `• Issues: ${summary.issuesFound}\n` +
               `• Quality Score: ${completenessRate}%\n\n` +
               `${summary.issuesFound === 0 ? 
                   '🎉 No issues found!' : 
                   `⚠️ ${summary.issuesFound} issues need attention.`
               }`
    }

    static generateComparisonEmailSubject(facility: FacilityInfo, result: ComparisonResult): string {
        const issueCount = result.summary.mismatchedRecords + result.summary.missingRecords
        const status = issueCount === 0 ? '✅ All Matched' : `⚠️ ${issueCount} Issues`
        return `Dataset Comparison ${status} - ${facility.name}`
    }

    static generateComparisonEmailHTML(facility: FacilityInfo, result: ComparisonResult): string {
        const timestamp = new Date().toLocaleString()
        const { summary } = result
        const issueCount = summary.mismatchedRecords + summary.missingRecords
        const matchRate = summary.totalRecords > 0 
            ? Math.round((summary.matchingRecords / summary.totalRecords) * 100)
            : 100

        const statusColor = issueCount === 0 ? '#28a745' : issueCount <= 10 ? '#ffc107' : '#dc3545'
        const statusIcon = issueCount === 0 ? '✅' : issueCount <= 10 ? '⚠️' : '❌'

        return `
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: ${statusColor}; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <h2 style="margin: 0;">${statusIcon} Dataset Comparison Report</h2>
                        </div>
                        
                        <h3>Facility Information</h3>
                        <p><strong>Facility:</strong> ${facility.name}</p>
                        <p><strong>Organization Unit:</strong> ${facility.orgUnitId}</p>
                        <p><strong>Timestamp:</strong> ${timestamp}</p>
                        
                        <h3>Datasets Compared</h3>
                        <ul>
                            ${result.datasets.map(ds => `<li><strong>${ds.name}</strong> (${ds.id})</li>`).join('')}
                        </ul>
                        
                        <h3>Comparison Summary</h3>
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                                <h4 style="margin: 0 0 10px 0; color: #495057;">Total Records</h4>
                                <div style="font-size: 24px; font-weight: bold; color: #007bff;">${summary.totalRecords}</div>
                            </div>
                            <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; text-align: center;">
                                <h4 style="margin: 0 0 10px 0; color: #495057;">Matching</h4>
                                <div style="font-size: 24px; font-weight: bold; color: #155724;">${summary.matchingRecords}</div>
                            </div>
                            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; text-align: center;">
                                <h4 style="margin: 0 0 10px 0; color: #495057;">Mismatched</h4>
                                <div style="font-size: 24px; font-weight: bold; color: #856404;">${summary.mismatchedRecords}</div>
                            </div>
                            <div style="background-color: #f8d7da; padding: 15px; border-radius: 8px; text-align: center;">
                                <h4 style="margin: 0 0 10px 0; color: #495057;">Missing</h4>
                                <div style="font-size: 24px; font-weight: bold; color: #721c24;">${summary.missingRecords}</div>
                            </div>
                        </div>
                        
                        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
                            <h4 style="margin: 0 0 10px 0; color: #495057;">Data Consistency Rate</h4>
                            <div style="font-size: 32px; font-weight: bold; color: #0066cc;">${matchRate}%</div>
                        </div>
                        
                        ${issueCount === 0 ? `
                            <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
                                <strong>🎉 Perfect Match!</strong> All data values are consistent across compared datasets.
                            </div>
                        ` : `
                            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
                                <strong>⚠️ Action Required:</strong> ${issueCount} inconsistencies found that need review.
                            </div>
                        `}
                        
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #dee2e6;">
                        <p style="font-size: 12px; color: #6c757d;">
                            This is an automated notification from the DHIS2 Data Quality Engine.<br>
                            Generated at ${timestamp}
                        </p>
                    </div>
                </body>
            </html>
        `
    }

    static generateComparisonWhatsApp(facility: FacilityInfo, result: ComparisonResult): string {
        const timestamp = new Date().toLocaleString()
        const { summary } = result
        const issueCount = summary.mismatchedRecords + summary.missingRecords
        const matchRate = summary.totalRecords > 0 
            ? Math.round((summary.matchingRecords / summary.totalRecords) * 100)
            : 100

        const statusIcon = issueCount === 0 ? '✅' : '⚠️'
        
        return `${statusIcon} *Dataset Comparison Report*\n\n` +
               `Facility: ${facility.name}\n` +
               `Time: ${timestamp}\n\n` +
               `📊 *Results:*\n` +
               `• Total Records: ${summary.totalRecords}\n` +
               `• Matching: ${summary.matchingRecords}\n` +
               `• Mismatched: ${summary.mismatchedRecords}\n` +
               `• Missing: ${summary.missingRecords}\n\n` +
               `🎯 *Consistency Rate: ${matchRate}%*\n\n` +
               `${issueCount === 0 ? 
                   '🎉 Perfect! All data matches.' : 
                   `⚠️ ${issueCount} issues need review.`
               }`
    }

    // SMS Templates (concise text-only versions)
    static generateDQRunSMS(facility: FacilityInfo, result: DQRunResult): string {
        const timestamp = new Date().toLocaleString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit',
            hour: '2-digit', 
            minute: '2-digit' 
        })
        
        if (!result.success) {
            return `DQ RUN FAILED\n` +
                   `Facility: ${facility.name}\n` +
                   `Period: ${result.summary?.period || 'Unknown'}\n` +
                   `Time: ${timestamp}\n` +
                   `Error: ${result.error || 'Unknown error'}\n` +
                   `Contact system administrator.`
        }

        const { summary } = result
        const completenessRate = summary.recordsProcessed > 0 
            ? Math.round(((summary.recordsProcessed - summary.issuesFound) / summary.recordsProcessed) * 100)
            : 100

        const statusIcon = summary.issuesFound === 0 ? 'GOOD' : summary.issuesFound <= 5 ? 'WARNING' : 'ISSUES'
        
        return `DQ REPORT [${statusIcon}]\n` +
               `Facility: ${facility.name}\n` +
               `Period: ${summary.period}\n` +
               `Time: ${timestamp}\n` +
               `Records: ${summary.recordsProcessed}\n` +
               `Issues: ${summary.issuesFound}\n` +
               `Quality: ${completenessRate}%\n` +
               `${summary.issuesFound === 0 ? 
                   'No issues found!' : 
                   `${summary.issuesFound} issues need attention.`
               }`
    }

    static generateComparisonSMS(facility: FacilityInfo, result: ComparisonResult): string {
        const timestamp = new Date().toLocaleString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit',
            hour: '2-digit', 
            minute: '2-digit' 
        })
        
        const { summary } = result
        const issueCount = summary.mismatchedRecords + summary.missingRecords
        const matchRate = summary.totalRecords > 0 
            ? Math.round((summary.matchingRecords / summary.totalRecords) * 100)
            : 100

        const statusIcon = issueCount === 0 ? 'MATCHED' : 'ISSUES'
        
        return `DATASET COMPARISON [${statusIcon}]\n` +
               `Facility: ${facility.name}\n` +
               `Time: ${timestamp}\n` +
               `Total: ${summary.totalRecords}\n` +
               `Matching: ${summary.matchingRecords}\n` +
               `Mismatched: ${summary.mismatchedRecords}\n` +
               `Missing: ${summary.missingRecords}\n` +
               `Consistency: ${matchRate}%\n` +
               `${issueCount === 0 ? 
                   'Perfect match!' : 
                   `${issueCount} issues need review.`
               }`
    }
}