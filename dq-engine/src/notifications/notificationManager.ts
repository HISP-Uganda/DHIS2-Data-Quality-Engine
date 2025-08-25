import { emailService, EmailNotification } from './emailService'
import { whatsappService, WhatsAppNotification } from './whatsappService'
import { smsService, SMSNotification } from './smsService'
import { NotificationTemplates, DQRunResult, ComparisonResult, FacilityInfo } from './templates'
import { facilityStore, FacilityContact } from './facilityStore'

export interface NotificationResult {
    emailsSent: number
    emailsFailed: number
    whatsappSent: number
    whatsappFailed: number
    smsSent: number
    smsFailed: number
    facilitiesNotified: string[]
    errors: string[]
}

class NotificationManager {
    async sendDQRunNotifications(
        orgUnitIds: string | string[], 
        result: DQRunResult
    ): Promise<NotificationResult> {
        const orgUnits = Array.isArray(orgUnitIds) ? orgUnitIds : [orgUnitIds]
        console.log(`[NotificationManager] Sending DQ run notifications for org units: ${orgUnits.join(', ')}`)

        const notificationResult: NotificationResult = {
            emailsSent: 0,
            emailsFailed: 0,
            whatsappSent: 0,
            whatsappFailed: 0,
            smsSent: 0,
            smsFailed: 0,
            facilitiesNotified: [],
            errors: []
        }

        // Get facilities that should be notified for DQ runs
        const facilitiesToNotify = facilityStore.getFacilitiesForDQNotifications()
            .filter(facility => orgUnits.includes(facility.orgUnitId))

        if (facilitiesToNotify.length === 0) {
            console.log('[NotificationManager] No facilities configured for DQ notifications')
            notificationResult.errors.push('No facilities configured for DQ notifications')
            return notificationResult
        }

        console.log(`[NotificationManager] Found ${facilitiesToNotify.length} facilities to notify`)

        // Send notifications to each facility
        for (const facility of facilitiesToNotify) {
            try {
                const facilityInfo: FacilityInfo = {
                    name: facility.name,
                    orgUnitId: facility.orgUnitId,
                    contacts: {
                        email: facility.email,
                        whatsapp: facility.whatsapp,
                        sms: facility.sms || []
                    }
                }

                // Send email notifications
                if (facility.notificationPreferences.emailEnabled && facility.email.length > 0) {
                    const emailNotification: EmailNotification = {
                        to: facility.email,
                        subject: NotificationTemplates.generateDQRunEmailSubject(facilityInfo, result),
                        text: NotificationTemplates.generateDQRunEmailText(facilityInfo, result),
                        html: NotificationTemplates.generateDQRunEmailHTML(facilityInfo, result)
                    }

                    const emailSent = await emailService.sendEmail(emailNotification)
                    if (emailSent) {
                        notificationResult.emailsSent += facility.email.length
                        console.log(`[NotificationManager] ✅ Email sent to ${facility.name}`)
                    } else {
                        notificationResult.emailsFailed += facility.email.length
                        notificationResult.errors.push(`Failed to send email to ${facility.name}`)
                    }
                }

                // Send WhatsApp notifications
                if (facility.notificationPreferences.whatsappEnabled && facility.whatsapp.length > 0) {
                    const whatsappNotification: WhatsAppNotification = {
                        to: facility.whatsapp,
                        message: NotificationTemplates.generateDQRunWhatsApp(facilityInfo, result)
                    }

                    const whatsappResult = await whatsappService.sendWhatsApp(whatsappNotification)
                    notificationResult.whatsappSent += whatsappResult.sent.length
                    notificationResult.whatsappFailed += whatsappResult.failed.length
                    
                    if (whatsappResult.sent.length > 0) {
                        console.log(`[NotificationManager] ✅ WhatsApp sent to ${facility.name}`)
                    }
                    if (whatsappResult.failed.length > 0) {
                        notificationResult.errors.push(`Failed to send WhatsApp to some contacts at ${facility.name}`)
                    }
                }

                // Send SMS notifications
                if (facility.notificationPreferences.smsEnabled && facility.sms && facility.sms.length > 0) {
                    const smsNotification: SMSNotification = {
                        to: facility.sms,
                        message: NotificationTemplates.generateDQRunSMS(facilityInfo, result)
                    }

                    const smsResult = await smsService.sendSMS(smsNotification)
                    notificationResult.smsSent += smsResult.sent.length
                    notificationResult.smsFailed += smsResult.failed.length
                    
                    if (smsResult.sent.length > 0) {
                        console.log(`[NotificationManager] ✅ SMS sent to ${facility.name}`)
                    }
                    if (smsResult.failed.length > 0) {
                        notificationResult.errors.push(`Failed to send SMS to some contacts at ${facility.name}`)
                    }
                }

                notificationResult.facilitiesNotified.push(facility.name)
            } catch (error) {
                console.error(`[NotificationManager] Error notifying facility ${facility.name}:`, error)
                notificationResult.errors.push(`Error notifying ${facility.name}: ${error}`)
            }
        }

        console.log('[NotificationManager] DQ notification summary:', {
            facilitiesNotified: notificationResult.facilitiesNotified.length,
            emailsSent: notificationResult.emailsSent,
            whatsappSent: notificationResult.whatsappSent,
            smsSent: notificationResult.smsSent,
            totalErrors: notificationResult.errors.length
        })

        return notificationResult
    }

    async sendComparisonNotifications(
        orgUnitId: string,
        result: ComparisonResult
    ): Promise<NotificationResult> {
        console.log(`[NotificationManager] Sending comparison notifications for org unit: ${orgUnitId}`)

        const notificationResult: NotificationResult = {
            emailsSent: 0,
            emailsFailed: 0,
            whatsappSent: 0,
            whatsappFailed: 0,
            smsSent: 0,
            smsFailed: 0,
            facilitiesNotified: [],
            errors: []
        }

        // Get facilities that should be notified for comparisons
        const facilitiesToNotify = facilityStore.getFacilitiesForComparisonNotifications()
            .filter(facility => facility.orgUnitId === orgUnitId)

        if (facilitiesToNotify.length === 0) {
            console.log('[NotificationManager] No facilities configured for comparison notifications')
            notificationResult.errors.push('No facilities configured for comparison notifications')
            return notificationResult
        }

        console.log(`[NotificationManager] Found ${facilitiesToNotify.length} facilities to notify`)

        // Send notifications to each facility
        for (const facility of facilitiesToNotify) {
            try {
                const facilityInfo: FacilityInfo = {
                    name: facility.name,
                    orgUnitId: facility.orgUnitId,
                    contacts: {
                        email: facility.email,
                        whatsapp: facility.whatsapp,
                        sms: facility.sms || []
                    }
                }

                // Send email notifications
                if (facility.notificationPreferences.emailEnabled && facility.email.length > 0) {
                    const emailNotification: EmailNotification = {
                        to: facility.email,
                        subject: NotificationTemplates.generateComparisonEmailSubject(facilityInfo, result),
                        text: NotificationTemplates.generateDQRunEmailText(facilityInfo, { 
                            success: true, 
                            summary: { 
                                recordsProcessed: result.summary.totalRecords,
                                issuesFound: result.summary.mismatchedRecords + result.summary.missingRecords,
                                period: result.comparisonResults[0]?.period || 'Unknown',
                                orgUnit: orgUnitId,
                                dataElements: result.summary.totalRecords,
                                destinationPosted: 0
                            }
                        }),
                        html: NotificationTemplates.generateComparisonEmailHTML(facilityInfo, result)
                    }

                    const emailSent = await emailService.sendEmail(emailNotification)
                    if (emailSent) {
                        notificationResult.emailsSent += facility.email.length
                        console.log(`[NotificationManager] ✅ Comparison email sent to ${facility.name}`)
                    } else {
                        notificationResult.emailsFailed += facility.email.length
                        notificationResult.errors.push(`Failed to send comparison email to ${facility.name}`)
                    }
                }

                // Send WhatsApp notifications
                if (facility.notificationPreferences.whatsappEnabled && facility.whatsapp.length > 0) {
                    const whatsappNotification: WhatsAppNotification = {
                        to: facility.whatsapp,
                        message: NotificationTemplates.generateComparisonWhatsApp(facilityInfo, result)
                    }

                    const whatsappResult = await whatsappService.sendWhatsApp(whatsappNotification)
                    notificationResult.whatsappSent += whatsappResult.sent.length
                    notificationResult.whatsappFailed += whatsappResult.failed.length
                    
                    if (whatsappResult.sent.length > 0) {
                        console.log(`[NotificationManager] ✅ Comparison WhatsApp sent to ${facility.name}`)
                    }
                    if (whatsappResult.failed.length > 0) {
                        notificationResult.errors.push(`Failed to send comparison WhatsApp to some contacts at ${facility.name}`)
                    }
                }

                // Send SMS notifications
                if (facility.notificationPreferences.smsEnabled && facility.sms && facility.sms.length > 0) {
                    const smsNotification: SMSNotification = {
                        to: facility.sms,
                        message: NotificationTemplates.generateComparisonSMS(facilityInfo, result)
                    }

                    const smsResult = await smsService.sendSMS(smsNotification)
                    notificationResult.smsSent += smsResult.sent.length
                    notificationResult.smsFailed += smsResult.failed.length
                    
                    if (smsResult.sent.length > 0) {
                        console.log(`[NotificationManager] ✅ Comparison SMS sent to ${facility.name}`)
                    }
                    if (smsResult.failed.length > 0) {
                        notificationResult.errors.push(`Failed to send comparison SMS to some contacts at ${facility.name}`)
                    }
                }

                notificationResult.facilitiesNotified.push(facility.name)
            } catch (error) {
                console.error(`[NotificationManager] Error notifying facility ${facility.name}:`, error)
                notificationResult.errors.push(`Error notifying ${facility.name}: ${error}`)
            }
        }

        console.log('[NotificationManager] Comparison notification summary:', {
            facilitiesNotified: notificationResult.facilitiesNotified.length,
            emailsSent: notificationResult.emailsSent,
            whatsappSent: notificationResult.whatsappSent,
            smsSent: notificationResult.smsSent,
            totalErrors: notificationResult.errors.length
        })

        return notificationResult
    }

    async testNotificationServices(): Promise<{
        email: { configured: boolean; connected: boolean }
        whatsapp: { configured: boolean; connected: boolean }
        sms: { configured: boolean; connected: boolean }
    }> {
        console.log('[NotificationManager] Testing notification services...')

        const emailConfigured = await emailService.isConfigured()
        const whatsappConfigured = await whatsappService.isConfigured()
        const smsConfigured = await smsService.isConfigured()

        let emailConnected = false
        let whatsappConnected = false
        let smsConnected = false

        if (emailConfigured) {
            emailConnected = await emailService.testConnection()
        }

        if (whatsappConfigured) {
            whatsappConnected = await whatsappService.testConnection()
        }

        if (smsConfigured) {
            smsConnected = await smsService.testConnection()
        }

        const result = {
            email: { configured: emailConfigured, connected: emailConnected },
            whatsapp: { configured: whatsappConfigured, connected: whatsappConnected },
            sms: { configured: smsConfigured, connected: smsConnected }
        }

        console.log('[NotificationManager] Service test results:', result)
        return result
    }

    // Auto-create facilities for new org units
    async ensureFacilityExists(orgUnitId: string, orgUnitName?: string): Promise<FacilityContact> {
        let facility = facilityStore.getFacilityByOrgUnit(orgUnitId)
        
        if (!facility) {
            console.log(`[NotificationManager] Creating default facility for org unit: ${orgUnitId}`)
            facility = facilityStore.createDefaultFacility(orgUnitId, orgUnitName || orgUnitId)
        }
        
        return facility
    }

    // Bulk notification for scheduled jobs
    async sendScheduledNotifications(
        type: 'dq-run' | 'comparison',
        orgUnitIds: string[],
        result: DQRunResult | ComparisonResult
    ): Promise<NotificationResult> {
        if (type === 'dq-run') {
            return this.sendDQRunNotifications(orgUnitIds, result as DQRunResult)
        } else {
            // For comparisons, we need to send to each org unit individually
            const allResults: NotificationResult = {
                emailsSent: 0,
                emailsFailed: 0,
                whatsappSent: 0,
                whatsappFailed: 0,
                smsSent: 0,
                smsFailed: 0,
                facilitiesNotified: [],
                errors: []
            }

            for (const orgUnitId of orgUnitIds) {
                const singleResult = await this.sendComparisonNotifications(orgUnitId, result as ComparisonResult)
                
                allResults.emailsSent += singleResult.emailsSent
                allResults.emailsFailed += singleResult.emailsFailed
                allResults.whatsappSent += singleResult.whatsappSent
                allResults.whatsappFailed += singleResult.whatsappFailed
                allResults.smsSent += singleResult.smsSent
                allResults.smsFailed += singleResult.smsFailed
                allResults.facilitiesNotified.push(...singleResult.facilitiesNotified)
                allResults.errors.push(...singleResult.errors)
            }

            return allResults
        }
    }
}

export const notificationManager = new NotificationManager()