"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDQAlert = formatDQAlert;
exports.sendSMSViaDHIS2 = sendSMSViaDHIS2;
exports.sendSMSViaDMark = sendSMSViaDMark;
exports.sendSMS = sendSMS;
exports.sendDQAlertSMS = sendDQAlertSMS;
exports.sendBulkSMS = sendBulkSMS;
exports.testSMSConfiguration = testSMSConfiguration;
const node_fetch_1 = __importDefault(require("node-fetch"));
// SMS Configuration - use functions to read env vars at runtime, not at module load time
const getDHIS2Config = () => {
    const config = {
        baseUrl: process.env.DHIS2_URL || 'https://dqas.hispuganda.org/dqa360',
        username: process.env.DHIS2_USERNAME || 'admin',
        password: process.env.DHIS2_PASSWORD || 'district'
    };
    console.log('[SMS] Reading env vars:', {
        DHIS2_URL: process.env.DHIS2_URL,
        DHIS2_USERNAME: process.env.DHIS2_USERNAME,
        DHIS2_PASSWORD: process.env.DHIS2_PASSWORD ? '***' : undefined
    });
    return config;
};
const DMARK_API_BASE = 'https://sms.dmarkmobile.com/v3';
const DMARK_USERNAME = 'HISPadmin';
const DMARK_PASSWORD = 'S4nH3dr!an';
// Cache token to avoid requesting it every time
let dmarkToken = null;
let dmarkTokenExpiry = 0;
/**
 * Format DQ comparison results into SMS message
 */
function formatDQAlert(data) {
    const issues = [];
    if (data.mismatchedRecords > 0)
        issues.push(`${data.mismatchedRecords} mismatched`);
    if (data.missingRecords > 0)
        issues.push(`${data.missingRecords} missing`);
    if (data.outOfRangeRecords > 0)
        issues.push(`${data.outOfRangeRecords} out-of-range`);
    const issueText = issues.length > 0 ? issues.join(', ') : 'No issues';
    let message = `DQ Alert: ${data.facilityName}\n`;
    message += `Period: ${data.period}\n`;
    message += `Status: ${issueText}\n`;
    message += `Valid: ${data.validRecords}/${data.totalRecords}`;
    if (data.dashboardUrl) {
        message += `\nView: ${data.dashboardUrl}`;
    }
    return message;
}
/**
 * Get D-Mark access token (with caching)
 */
async function getDMarkToken() {
    // Check if we have a valid cached token
    if (dmarkToken && Date.now() < dmarkTokenExpiry) {
        console.log('[SMS] Using cached D-Mark token');
        return dmarkToken;
    }
    // Get new token
    console.log('[SMS] Requesting new D-Mark token...');
    try {
        const response = await (0, node_fetch_1.default)(`${DMARK_API_BASE}/api/get_token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: DMARK_USERNAME,
                password: DMARK_PASSWORD
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get D-Mark token: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        const token = result?.access_token;
        if (!token) {
            throw new Error('No access token in D-Mark response');
        }
        dmarkToken = token;
        // Token expires in 24 hours, cache for 23 hours to be safe
        dmarkTokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
        console.log('[SMS] ✓ New D-Mark token obtained');
        return token;
    }
    catch (error) {
        console.error('[SMS] Failed to get D-Mark token:', error.message);
        throw error;
    }
}
/**
 * Send SMS via DHIS2 SMS API (Recommended - uses existing gateway)
 */
async function sendSMSViaDHIS2(sms) {
    try {
        const config = getDHIS2Config();
        console.log('[SMS] DHIS2 credentials:', { username: config.username, hasPassword: !!config.password });
        const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');
        const response = await (0, node_fetch_1.default)(`${config.baseUrl}/api/sms/outbound`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: sms.message,
                recipients: [sms.recipient.replace(/^\+/, '')] // DHIS2 expects array
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`DHIS2 SMS API error: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        return {
            success: true,
            messageId: result.id || result.messageId,
            provider: 'dhis2'
        };
    }
    catch (error) {
        console.error('[SMS] DHIS2 send failed:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'dhis2'
        };
    }
}
/**
 * Send SMS directly via D-Mark API (Fallback or advanced features)
 */
async function sendSMSViaDMark(sms) {
    try {
        // Get access token
        const token = await getDMarkToken();
        // Send message as-is, no encoding/decoding
        const payload = {
            msg: sms.message,
            numbers: sms.recipient.replace(/^\+/, ''), // Remove + prefix if present
            dlr_url: '' // Optional: Add delivery report URL
        };
        console.log('[SMS] D-Mark payload:', { msg: sms.message.substring(0, 100), numbers: payload.numbers });
        const response = await (0, node_fetch_1.default)(`${DMARK_API_BASE}/api/send_sms/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`D-Mark API error: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        return {
            success: true,
            messageId: result?.message_id || result?.id,
            provider: 'dmark'
        };
    }
    catch (error) {
        console.error('[SMS] D-Mark send failed:', error.message);
        return {
            success: false,
            error: error.message,
            provider: 'dmark'
        };
    }
}
/**
 * Smart SMS sender - tries DHIS2 first, falls back to D-Mark
 */
async function sendSMS(sms, preferredProvider = 'dhis2') {
    console.log(`[SMS] Sending to ${sms.recipient} via ${preferredProvider}`);
    // Try preferred provider first
    let result;
    if (preferredProvider === 'dhis2') {
        result = await sendSMSViaDHIS2(sms);
        // Fallback to D-Mark if DHIS2 fails
        if (!result.success) {
            console.log('[SMS] DHIS2 failed, trying D-Mark...');
            result = await sendSMSViaDMark(sms);
        }
    }
    else {
        result = await sendSMSViaDMark(sms);
        // Fallback to DHIS2 if D-Mark fails
        if (!result.success) {
            console.log('[SMS] D-Mark failed, trying DHIS2...');
            result = await sendSMSViaDHIS2(sms);
        }
    }
    return result;
}
/**
 * Send DQ Alert SMS to facility
 */
async function sendDQAlertSMS(phone, alertData, provider = 'dhis2') {
    const message = formatDQAlert(alertData);
    return sendSMS({
        recipient: phone,
        message: message
    }, provider);
}
/**
 * Send bulk SMS to multiple facilities
 *
 */
async function sendBulkSMS(recipients, provider = 'dhis2') {
    const results = [];
    for (const recipient of recipients) {
        const result = await sendSMS({
            recipient: recipient.phone,
            message: recipient.message
        }, provider);
        results.push({
            ...result,
            phone: recipient.phone
        });
        // Rate limiting: wait 100ms between messages
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    return results;
}
/**
 * Test SMS configuration
 */
async function testSMSConfiguration(testPhone) {
    const testMessage = {
        recipient: testPhone,
        message: 'Test SMS from IWS DQ Dashboard. Configuration successful!'
    };
    const [dhis2Result, dmarkResult] = await Promise.all([
        sendSMSViaDHIS2(testMessage),
        sendSMSViaDMark(testMessage)
    ]);
    return {
        dhis2: dhis2Result,
        dmark: dmarkResult
    };
}
