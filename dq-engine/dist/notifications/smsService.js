"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsService = void 0;
const twilio_1 = require("twilio");
class SMSService {
    constructor() {
        this.client = null;
        this.config = null;
        this.initializeFromEnv();
    }
    initializeFromEnv() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_SMS_FROM;
        if (accountSid && authToken && fromNumber) {
            this.configure({
                accountSid,
                authToken,
                fromNumber
            });
        }
    }
    configure(config) {
        this.config = config;
        this.client = new twilio_1.Twilio(config.accountSid, config.authToken);
        console.log('[SMSService] Configured with from number:', config.fromNumber);
    }
    async isConfigured() {
        return this.client !== null && this.config !== null;
    }
    async testConnection() {
        if (!this.client || !this.config) {
            console.log('[SMSService] No client configured');
            return false;
        }
        try {
            // Test by fetching account details
            const account = await this.client.api.accounts(this.config.accountSid).fetch();
            console.log('[SMSService] ✅ Connection test successful for account:', account.friendlyName);
            return true;
        }
        catch (error) {
            console.error('[SMSService] ❌ Connection test failed:', error);
            return false;
        }
    }
    async sendSMS(notification) {
        if (!this.client || !this.config) {
            console.error('[SMSService] SMS service not configured');
            return { sent: [], failed: notification.to };
        }
        const sent = [];
        const failed = [];
        for (const phoneNumber of notification.to) {
            try {
                const formattedTo = this.formatPhoneNumber(phoneNumber);
                const message = await this.client.messages.create({
                    body: notification.message,
                    from: this.config.fromNumber,
                    to: formattedTo
                });
                console.log('[SMSService] ✅ SMS sent successfully:', message.sid, 'to', phoneNumber);
                sent.push(phoneNumber);
            }
            catch (error) {
                console.error('[SMSService] ❌ Failed to send SMS to', phoneNumber, ':', error);
                failed.push(phoneNumber);
            }
            // Add delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        console.log(`[SMSService] SMS batch complete: ${sent.length} sent, ${failed.length} failed`);
        return { sent, failed };
    }
    async sendBulkSMS(notifications) {
        let totalSent = 0;
        let totalFailed = 0;
        for (const notification of notifications) {
            const result = await this.sendSMS(notification);
            totalSent += result.sent.length;
            totalFailed += result.failed.length;
            // Add delay between notification batches
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log(`[SMSService] Bulk SMS complete: ${totalSent} sent, ${totalFailed} failed`);
        return { totalSent, totalFailed };
    }
    formatPhoneNumber(phoneNumber) {
        // Remove any non-numeric characters except +
        let cleaned = phoneNumber.replace(/[^\d+]/g, '');
        // Ensure it starts with +
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }
        return cleaned;
    }
    // SMS-specific helper methods
    async getAccountBalance() {
        if (!this.client || !this.config) {
            return null;
        }
        try {
            const balance = await this.client.balance.fetch();
            return parseFloat(balance.balance) || 0;
        }
        catch (error) {
            console.error('[SMSService] Failed to get account balance:', error);
            return null;
        }
    }
    async validatePhoneNumber(phoneNumber) {
        if (!this.client) {
            return false;
        }
        try {
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            const lookup = await this.client.lookups.v1.phoneNumbers(formattedNumber).fetch();
            return lookup.phoneNumber !== null;
        }
        catch (error) {
            console.error('[SMSService] Phone number validation failed:', error);
            return false;
        }
    }
}
exports.smsService = new SMSService();
