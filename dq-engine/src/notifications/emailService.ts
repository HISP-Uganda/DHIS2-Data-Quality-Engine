import nodemailer from 'nodemailer'

export interface EmailConfig {
    host: string
    port: number
    secure: boolean
    user: string
    pass: string
    from: string
}

export interface EmailNotification {
    to: string[]
    subject: string
    text: string
    html: string
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null
    private config: EmailConfig | null = null

    constructor() {
        this.initializeFromEnv()
    }

    private initializeFromEnv() {
        const host = process.env.SMTP_HOST
        const port = process.env.SMTP_PORT
        const user = process.env.SMTP_USER
        const pass = process.env.SMTP_PASS
        const from = process.env.SMTP_FROM

        if (host && port && user && pass && from) {
            this.configure({
                host,
                port: parseInt(port),
                secure: port === '465',
                user,
                pass,
                from
            })
        }
    }

    configure(config: EmailConfig) {
        this.config = config
        this.transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.user,
                pass: config.pass
            }
        })
        
        console.log('[EmailService] Configured with host:', config.host)
    }

    async isConfigured(): Promise<boolean> {
        return this.transporter !== null && this.config !== null
    }

    async testConnection(): Promise<boolean> {
        if (!this.transporter) {
            console.log('[EmailService] No transporter configured')
            return false
        }

        try {
            await this.transporter.verify()
            console.log('[EmailService] ✅ Connection test successful')
            return true
        } catch (error) {
            console.error('[EmailService] ❌ Connection test failed:', error)
            return false
        }
    }

    async sendEmail(notification: EmailNotification): Promise<boolean> {
        if (!this.transporter || !this.config) {
            console.error('[EmailService] Email service not configured')
            return false
        }

        try {
            const info = await this.transporter.sendMail({
                from: this.config.from,
                to: notification.to.join(', '),
                subject: notification.subject,
                text: notification.text,
                html: notification.html
            })

            console.log('[EmailService] ✅ Email sent successfully:', info.messageId)
            console.log('[EmailService] Recipients:', notification.to.join(', '))
            return true
        } catch (error) {
            console.error('[EmailService] ❌ Failed to send email:', error)
            return false
        }
    }

    async sendBulkEmails(notifications: EmailNotification[]): Promise<{ sent: number; failed: number }> {
        let sent = 0
        let failed = 0

        for (const notification of notifications) {
            const success = await this.sendEmail(notification)
            if (success) {
                sent++
            } else {
                failed++
            }
            
            // Add small delay between emails to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100))
        }

        console.log(`[EmailService] Bulk email complete: ${sent} sent, ${failed} failed`)
        return { sent, failed }
    }
}

export const emailService = new EmailService()