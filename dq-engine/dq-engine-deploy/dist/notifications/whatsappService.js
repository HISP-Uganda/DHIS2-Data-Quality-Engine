"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = void 0;
const twilio_1 = require("twilio");
class WhatsAppService {
    constructor() {
        this.client = null;
        this.config = null;
        this.initializeFromEnv();
    }
    initializeFromEnv() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
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
        console.log('[WhatsAppService] Configured with from number:', config.fromNumber);
    }
    async isConfigured() {
        return this.client !== null && this.config !== null;
    }
    async testConnection() {
        if (!this.client || !this.config) {
            console.log('[WhatsAppService] No client configured');
            return false;
        }
        try {
            // Test by fetching account details
            const account = await this.client.api.accounts(this.config.accountSid).fetch();
            console.log('[WhatsAppService] ✅ Connection test successful for account:', account.friendlyName);
            return true;
        }
        catch (error) {
            console.error('[WhatsAppService] ❌ Connection test failed:', error);
            return false;
        }
    }
    async sendWhatsApp(notification) {
        if (!this.client || !this.config) {
            console.error('[WhatsAppService] WhatsApp service not configured');
            return { sent: [], failed: notification.to };
        }
        const sent = [];
        const failed = [];
        for (const phoneNumber of notification.to) {
            try {
                const formattedTo = phoneNumber.startsWith('whatsapp:')
                    ? phoneNumber
                    : `whatsapp:${phoneNumber}`;
                const message = await this.client.messages.create({
                    body: notification.message,
                    from: this.config.fromNumber,
                    to: formattedTo
                });
                console.log('[WhatsAppService] ✅ WhatsApp sent successfully:', message.sid, 'to', phoneNumber);
                sent.push(phoneNumber);
            }
            catch (error) {
                console.error('[WhatsAppService] ❌ Failed to send WhatsApp to', phoneNumber, ':', error);
                failed.push(phoneNumber);
            }
            // Add delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        console.log(`[WhatsAppService] WhatsApp batch complete: ${sent.length} sent, ${failed.length} failed`);
        return { sent, failed };
    }
    async sendBulkWhatsApp(notifications) {
        let totalSent = 0;
        let totalFailed = 0;
        for (const notification of notifications) {
            const result = await this.sendWhatsApp(notification);
            totalSent += result.sent.length;
            totalFailed += result.failed.length;
            // Add delay between notification batches
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log(`[WhatsAppService] Bulk WhatsApp complete: ${totalSent} sent, ${totalFailed} failed`);
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
}
exports.whatsappService = new WhatsAppService();
