import { Twilio } from 'twilio'

export interface WhatsAppConfig {
    accountSid: string
    authToken: string
    fromNumber: string // WhatsApp Business number in format: whatsapp:+1234567890
}

export interface WhatsAppNotification {
    to: string[] // Phone numbers in format: +1234567890
    message: string
}

class WhatsAppService {
    private client: Twilio | null = null
    private config: WhatsAppConfig | null = null

    constructor() {
        this.initializeFromEnv()
    }

    private initializeFromEnv() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID
        const authToken = process.env.TWILIO_AUTH_TOKEN
        const fromNumber = process.env.TWILIO_WHATSAPP_FROM

        if (accountSid && authToken && fromNumber) {
            this.configure({
                accountSid,
                authToken,
                fromNumber
            })
        }
    }

    configure(config: WhatsAppConfig) {
        this.config = config
        this.client = new Twilio(config.accountSid, config.authToken)
        
        console.log('[WhatsAppService] Configured with from number:', config.fromNumber)
    }

    async isConfigured(): Promise<boolean> {
        return this.client !== null && this.config !== null
    }

    async testConnection(): Promise<boolean> {
        if (!this.client || !this.config) {
            console.log('[WhatsAppService] No client configured')
            return false
        }

        try {
            // Test by fetching account details
            const account = await this.client.api.accounts(this.config.accountSid).fetch()
            console.log('[WhatsAppService] ✅ Connection test successful for account:', account.friendlyName)
            return true
        } catch (error) {
            console.error('[WhatsAppService] ❌ Connection test failed:', error)
            return false
        }
    }

    async sendWhatsApp(notification: WhatsAppNotification): Promise<{ sent: string[]; failed: string[] }> {
        if (!this.client || !this.config) {
            console.error('[WhatsAppService] WhatsApp service not configured')
            return { sent: [], failed: notification.to }
        }

        const sent: string[] = []
        const failed: string[] = []

        for (const phoneNumber of notification.to) {
            try {
                const formattedTo = phoneNumber.startsWith('whatsapp:') 
                    ? phoneNumber 
                    : `whatsapp:${phoneNumber}`
                
                const message = await this.client.messages.create({
                    body: notification.message,
                    from: this.config.fromNumber,
                    to: formattedTo
                })

                console.log('[WhatsAppService] ✅ WhatsApp sent successfully:', message.sid, 'to', phoneNumber)
                sent.push(phoneNumber)
            } catch (error) {
                console.error('[WhatsAppService] ❌ Failed to send WhatsApp to', phoneNumber, ':', error)
                failed.push(phoneNumber)
            }

            // Add delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200))
        }

        console.log(`[WhatsAppService] WhatsApp batch complete: ${sent.length} sent, ${failed.length} failed`)
        return { sent, failed }
    }

    async sendBulkWhatsApp(notifications: WhatsAppNotification[]): Promise<{ totalSent: number; totalFailed: number }> {
        let totalSent = 0
        let totalFailed = 0

        for (const notification of notifications) {
            const result = await this.sendWhatsApp(notification)
            totalSent += result.sent.length
            totalFailed += result.failed.length
            
            // Add delay between notification batches
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        console.log(`[WhatsAppService] Bulk WhatsApp complete: ${totalSent} sent, ${totalFailed} failed`)
        return { totalSent, totalFailed }
    }

    private formatPhoneNumber(phoneNumber: string): string {
        // Remove any non-numeric characters except +
        let cleaned = phoneNumber.replace(/[^\d+]/g, '')
        
        // Ensure it starts with +
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned
        }
        
        return cleaned
    }
}

export const whatsappService = new WhatsAppService()