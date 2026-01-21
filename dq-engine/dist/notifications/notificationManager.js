"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationManager = void 0;
const emailService_1 = require("./emailService");
const whatsappService_1 = require("./whatsappService");
const smsService_1 = require("./smsService");
const newSmsService = __importStar(require("../services/smsService"));
const templates_1 = require("./templates");
const facilityStore_1 = require("./facilityStore");
class NotificationManager {
    async sendDQRunNotifications(orgUnitIds, result) {
        const orgUnits = Array.isArray(orgUnitIds) ? orgUnitIds : [orgUnitIds];
        console.log(`[NotificationManager] Sending DQ run notifications for org units: ${orgUnits.join(', ')}`);
        const notificationResult = {
            emailsSent: 0,
            emailsFailed: 0,
            whatsappSent: 0,
            whatsappFailed: 0,
            smsSent: 0,
            smsFailed: 0,
            facilitiesNotified: [],
            errors: []
        };
        // Get facilities that should be notified for DQ runs
        const facilitiesToNotify = facilityStore_1.facilityStore.getFacilitiesForDQNotifications()
            .filter(facility => orgUnits.includes(facility.orgUnitId));
        if (facilitiesToNotify.length === 0) {
            console.log('[NotificationManager] No facilities configured for DQ notifications');
            notificationResult.errors.push('No facilities configured for DQ notifications');
            return notificationResult;
        }
        console.log(`[NotificationManager] Found ${facilitiesToNotify.length} facilities to notify`);
        // Send notifications to each facility
        for (const facility of facilitiesToNotify) {
            try {
                const facilityInfo = {
                    name: facility.name,
                    orgUnitId: facility.orgUnitId,
                    contacts: {
                        email: facility.email,
                        whatsapp: facility.whatsapp,
                        sms: facility.sms || []
                    }
                };
                // Send email notifications
                if (facility.notificationPreferences.emailEnabled && facility.email.length > 0) {
                    const emailNotification = {
                        to: facility.email,
                        subject: templates_1.NotificationTemplates.generateDQRunEmailSubject(facilityInfo, result),
                        text: templates_1.NotificationTemplates.generateDQRunEmailText(facilityInfo, result),
                        html: templates_1.NotificationTemplates.generateDQRunEmailHTML(facilityInfo, result)
                    };
                    const emailSent = await emailService_1.emailService.sendEmail(emailNotification);
                    if (emailSent) {
                        notificationResult.emailsSent += facility.email.length;
                        console.log(`[NotificationManager] ✅ Email sent to ${facility.name}`);
                    }
                    else {
                        notificationResult.emailsFailed += facility.email.length;
                        notificationResult.errors.push(`Failed to send email to ${facility.name}`);
                    }
                }
                // Send WhatsApp notifications
                if (facility.notificationPreferences.whatsappEnabled && facility.whatsapp.length > 0) {
                    const whatsappNotification = {
                        to: facility.whatsapp,
                        message: templates_1.NotificationTemplates.generateDQRunWhatsApp(facilityInfo, result)
                    };
                    const whatsappResult = await whatsappService_1.whatsappService.sendWhatsApp(whatsappNotification);
                    notificationResult.whatsappSent += whatsappResult.sent.length;
                    notificationResult.whatsappFailed += whatsappResult.failed.length;
                    if (whatsappResult.sent.length > 0) {
                        console.log(`[NotificationManager] ✅ WhatsApp sent to ${facility.name}`);
                    }
                    if (whatsappResult.failed.length > 0) {
                        notificationResult.errors.push(`Failed to send WhatsApp to some contacts at ${facility.name}`);
                    }
                }
                // Send SMS notifications (using new D-Mark service)
                if (facility.notificationPreferences.smsEnabled && facility.sms && facility.sms.length > 0) {
                    console.log('[NotificationManager] About to generate SMS with result:', {
                        success: result.success,
                        issuesFound: result.summary.issuesFound,
                        recordsProcessed: result.summary.recordsProcessed,
                        resultsCount: result.results?.length || 0,
                        period: result.summary.period
                    });
                    const message = templates_1.NotificationTemplates.generateDQRunSMS(facilityInfo, result);
                    console.log('[NotificationManager] Generated SMS message:', {
                        length: message.length,
                        preview: message.substring(0, 100),
                        hasNewlines: message.includes('\n'),
                        hasSpaces: message.includes(' ')
                    });
                    for (const phoneNumber of facility.sms) {
                        try {
                            const smsResult = await newSmsService.sendSMS({
                                recipient: phoneNumber,
                                message
                            }, 'dhis2'); // Try DHIS2 first, fallback to D-Mark
                            if (smsResult.success) {
                                notificationResult.smsSent++;
                                console.log(`[NotificationManager] ✅ SMS sent to ${phoneNumber} at ${facility.name} via ${smsResult.provider}`);
                            }
                            else {
                                notificationResult.smsFailed++;
                                notificationResult.errors.push(`Failed to send SMS to ${phoneNumber} at ${facility.name}: ${smsResult.error}`);
                                console.error(`[NotificationManager] ❌ SMS failed to ${phoneNumber}: ${smsResult.error}`);
                            }
                        }
                        catch (error) {
                            notificationResult.smsFailed++;
                            notificationResult.errors.push(`Error sending SMS to ${phoneNumber} at ${facility.name}: ${error.message}`);
                            console.error(`[NotificationManager] ❌ SMS exception to ${phoneNumber}:`, error);
                        }
                    }
                }
                notificationResult.facilitiesNotified.push(facility.name);
            }
            catch (error) {
                console.error(`[NotificationManager] Error notifying facility ${facility.name}:`, error);
                notificationResult.errors.push(`Error notifying ${facility.name}: ${error}`);
            }
        }
        console.log('[NotificationManager] DQ notification summary:', {
            facilitiesNotified: notificationResult.facilitiesNotified.length,
            emailsSent: notificationResult.emailsSent,
            whatsappSent: notificationResult.whatsappSent,
            smsSent: notificationResult.smsSent,
            totalErrors: notificationResult.errors.length
        });
        return notificationResult;
    }
    async sendComparisonNotifications(orgUnitId, result) {
        console.log(`[NotificationManager] Sending comparison notifications for org unit: ${orgUnitId}`);
        const notificationResult = {
            emailsSent: 0,
            emailsFailed: 0,
            whatsappSent: 0,
            whatsappFailed: 0,
            smsSent: 0,
            smsFailed: 0,
            facilitiesNotified: [],
            errors: []
        };
        // Get facilities that should be notified for comparisons
        const facilitiesToNotify = facilityStore_1.facilityStore.getFacilitiesForComparisonNotifications()
            .filter(facility => facility.orgUnitId === orgUnitId);
        if (facilitiesToNotify.length === 0) {
            console.log('[NotificationManager] No facilities configured for comparison notifications');
            notificationResult.errors.push('No facilities configured for comparison notifications');
            return notificationResult;
        }
        console.log(`[NotificationManager] Found ${facilitiesToNotify.length} facilities to notify`);
        // Send notifications to each facility
        for (const facility of facilitiesToNotify) {
            try {
                const facilityInfo = {
                    name: facility.name,
                    orgUnitId: facility.orgUnitId,
                    contacts: {
                        email: facility.email,
                        whatsapp: facility.whatsapp,
                        sms: facility.sms || []
                    }
                };
                // Send email notifications
                if (facility.notificationPreferences.emailEnabled && facility.email.length > 0) {
                    const emailNotification = {
                        to: facility.email,
                        subject: templates_1.NotificationTemplates.generateComparisonEmailSubject(facilityInfo, result),
                        text: templates_1.NotificationTemplates.generateDQRunEmailText(facilityInfo, {
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
                        html: templates_1.NotificationTemplates.generateComparisonEmailHTML(facilityInfo, result)
                    };
                    const emailSent = await emailService_1.emailService.sendEmail(emailNotification);
                    if (emailSent) {
                        notificationResult.emailsSent += facility.email.length;
                        console.log(`[NotificationManager] ✅ Comparison email sent to ${facility.name}`);
                    }
                    else {
                        notificationResult.emailsFailed += facility.email.length;
                        notificationResult.errors.push(`Failed to send comparison email to ${facility.name}`);
                    }
                }
                // Send WhatsApp notifications
                if (facility.notificationPreferences.whatsappEnabled && facility.whatsapp.length > 0) {
                    const whatsappNotification = {
                        to: facility.whatsapp,
                        message: templates_1.NotificationTemplates.generateComparisonWhatsApp(facilityInfo, result)
                    };
                    const whatsappResult = await whatsappService_1.whatsappService.sendWhatsApp(whatsappNotification);
                    notificationResult.whatsappSent += whatsappResult.sent.length;
                    notificationResult.whatsappFailed += whatsappResult.failed.length;
                    if (whatsappResult.sent.length > 0) {
                        console.log(`[NotificationManager] ✅ Comparison WhatsApp sent to ${facility.name}`);
                    }
                    if (whatsappResult.failed.length > 0) {
                        notificationResult.errors.push(`Failed to send comparison WhatsApp to some contacts at ${facility.name}`);
                    }
                }
                // Send SMS notifications (using new D-Mark service)
                if (facility.notificationPreferences.smsEnabled && facility.sms && facility.sms.length > 0) {
                    // Increment DQ run count and get the new number
                    const runNumber = facilityStore_1.facilityStore.incrementDQRunCount(facility.orgUnitId);
                    // Get dashboard URL from environment or use default
                    const dashboardUrl = process.env.DASHBOARD_URL || 'https://dqas.hispuganda.org/dqa360';
                    const message = templates_1.NotificationTemplates.generateComparisonSMS(facilityInfo, result, runNumber, dashboardUrl);
                    console.log(`[NotificationManager] Sending SMS to ${facility.name} (Run #${runNumber}):`, message);
                    for (const phoneNumber of facility.sms) {
                        try {
                            const smsResult = await newSmsService.sendSMS({
                                recipient: phoneNumber,
                                message
                            }, 'dhis2'); // Try DHIS2 first, fallback to D-Mark
                            if (smsResult.success) {
                                notificationResult.smsSent++;
                                console.log(`[NotificationManager] ✅ Comparison SMS sent to ${phoneNumber} at ${facility.name} via ${smsResult.provider}`);
                            }
                            else {
                                notificationResult.smsFailed++;
                                notificationResult.errors.push(`Failed to send comparison SMS to ${phoneNumber} at ${facility.name}: ${smsResult.error}`);
                            }
                        }
                        catch (error) {
                            notificationResult.smsFailed++;
                            notificationResult.errors.push(`Error sending comparison SMS to ${phoneNumber} at ${facility.name}: ${error.message}`);
                        }
                    }
                }
                notificationResult.facilitiesNotified.push(facility.name);
            }
            catch (error) {
                console.error(`[NotificationManager] Error notifying facility ${facility.name}:`, error);
                notificationResult.errors.push(`Error notifying ${facility.name}: ${error}`);
            }
        }
        console.log('[NotificationManager] Comparison notification summary:', {
            facilitiesNotified: notificationResult.facilitiesNotified.length,
            emailsSent: notificationResult.emailsSent,
            whatsappSent: notificationResult.whatsappSent,
            smsSent: notificationResult.smsSent,
            totalErrors: notificationResult.errors.length
        });
        return notificationResult;
    }
    async testNotificationServices() {
        console.log('[NotificationManager] Testing notification services...');
        const emailConfigured = await emailService_1.emailService.isConfigured();
        const whatsappConfigured = await whatsappService_1.whatsappService.isConfigured();
        const smsConfigured = await smsService_1.smsService.isConfigured();
        let emailConnected = false;
        let whatsappConnected = false;
        let smsConnected = false;
        if (emailConfigured) {
            emailConnected = await emailService_1.emailService.testConnection();
        }
        if (whatsappConfigured) {
            whatsappConnected = await whatsappService_1.whatsappService.testConnection();
        }
        if (smsConfigured) {
            smsConnected = await smsService_1.smsService.testConnection();
        }
        const result = {
            email: { configured: emailConfigured, connected: emailConnected },
            whatsapp: { configured: whatsappConfigured, connected: whatsappConnected },
            sms: { configured: smsConfigured, connected: smsConnected }
        };
        console.log('[NotificationManager] Service test results:', result);
        return result;
    }
    // Auto-create facilities for new org units
    async ensureFacilityExists(orgUnitId, orgUnitName) {
        let facility = facilityStore_1.facilityStore.getFacilityByOrgUnit(orgUnitId);
        if (!facility) {
            console.log(`[NotificationManager] Creating default facility for org unit: ${orgUnitId}`);
            facility = facilityStore_1.facilityStore.createDefaultFacility(orgUnitId, orgUnitName || orgUnitId);
        }
        return facility;
    }
    // Bulk notification for scheduled jobs
    async sendScheduledNotifications(type, orgUnitIds, result) {
        if (type === 'dq-run') {
            return this.sendDQRunNotifications(orgUnitIds, result);
        }
        else {
            // For comparisons, we need to send to each org unit individually
            const allResults = {
                emailsSent: 0,
                emailsFailed: 0,
                whatsappSent: 0,
                whatsappFailed: 0,
                smsSent: 0,
                smsFailed: 0,
                facilitiesNotified: [],
                errors: []
            };
            for (const orgUnitId of orgUnitIds) {
                const singleResult = await this.sendComparisonNotifications(orgUnitId, result);
                allResults.emailsSent += singleResult.emailsSent;
                allResults.emailsFailed += singleResult.emailsFailed;
                allResults.whatsappSent += singleResult.whatsappSent;
                allResults.whatsappFailed += singleResult.whatsappFailed;
                allResults.smsSent += singleResult.smsSent;
                allResults.smsFailed += singleResult.smsFailed;
                allResults.facilitiesNotified.push(...singleResult.facilitiesNotified);
                allResults.errors.push(...singleResult.errors);
            }
            return allResults;
        }
    }
}
exports.notificationManager = new NotificationManager();
