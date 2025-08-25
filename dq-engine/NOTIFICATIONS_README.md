# Data Quality Notification System

This document describes the comprehensive notification system for sending automated alerts to facilities via email and WhatsApp after data quality comparisons are completed.

## Features

- **Email Notifications**: HTML-formatted reports sent via SMTP
- **WhatsApp Notifications**: Text messages sent via Twilio
- **Dual Triggers**: Notifications sent after both DQ runs and dataset comparisons
- **Facility Management**: Configure contacts and preferences per organizational unit
- **Rich Templates**: Professional email templates and concise WhatsApp messages
- **Error Handling**: Graceful degradation when notification services fail

## Architecture

### Core Components

1. **Email Service** (`emailService.ts`): SMTP-based email delivery using nodemailer
2. **WhatsApp Service** (`whatsappService.ts`): WhatsApp Business API via Twilio
3. **Notification Manager** (`notificationManager.ts`): Orchestrates notifications across services
4. **Templates** (`templates.ts`): Rich HTML/text templates for different notification types
5. **Facility Store** (`facilityStore.ts`): Manages facility contacts and preferences

### Integration Points

- **DQ Engine**: Notifications sent after `runDQ()` completes (success/failure)
- **Dataset Comparison**: Notifications sent after `/api/compare-datasets` completes
- **Scheduled Jobs**: Automatic notifications for cron-based DQ runs

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed via the main package.json:
- `nodemailer` for email
- `@types/nodemailer` for TypeScript support
- `twilio` for WhatsApp

### 2. Environment Configuration

Copy and configure the environment file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# WhatsApp Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
```

### 3. Email Setup (Gmail Example)

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the app password as `SMTP_PASS`

### 4. WhatsApp Setup (Twilio)

1. Create a Twilio account at https://www.twilio.com
2. Get your Account SID and Auth Token from the console
3. Request WhatsApp Business approval:
   - Go to Messaging → Try it out → Send a WhatsApp message
   - Follow the WhatsApp Business setup process
4. Use the Twilio WhatsApp number as `TWILIO_WHATSAPP_FROM`

## API Endpoints

### Facility Management

#### Get All Facilities
```http
GET /api/facilities
```

#### Add New Facility
```http
POST /api/facilities
Content-Type: application/json

{
  "name": "Health Center A",
  "orgUnitId": "OU123456",
  "email": ["manager@healthcenter.com", "data@healthcenter.com"],
  "whatsapp": ["+1234567890", "+0987654321"],
  "enabled": true,
  "notificationPreferences": {
    "dqRuns": true,
    "comparisons": true,
    "emailEnabled": true,
    "whatsappEnabled": true
  }
}
```

#### Update Facility
```http
PUT /api/facilities/:id
Content-Type: application/json

{
  "email": ["new-email@facility.com"],
  "notificationPreferences": {
    "dqRuns": false
  }
}
```

#### Delete Facility
```http
DELETE /api/facilities/:id
```

### Notification Configuration

#### Configure Email Service
```http
POST /api/notifications/configure-email
Content-Type: application/json

{
  "host": "smtp.gmail.com",
  "port": 587,
  "secure": false,
  "user": "your-email@gmail.com",
  "pass": "your-app-password",
  "from": "your-email@gmail.com"
}
```

#### Configure WhatsApp Service
```http
POST /api/notifications/configure-whatsapp
Content-Type: application/json

{
  "accountSid": "your-twilio-account-sid",
  "authToken": "your-twilio-auth-token",
  "fromNumber": "whatsapp:+1234567890"
}
```

#### Test Services
```http
GET /api/notifications/test-services
```

Response:
```json
{
  "email": {
    "configured": true,
    "connected": true
  },
  "whatsapp": {
    "configured": true,
    "connected": true
  }
}
```

### Test Notifications

#### Test DQ Notification
```http
POST /api/notifications/test-dq
Content-Type: application/json

{
  "orgUnitId": "OU123456"
}
```

## Notification Templates

### Email Templates

#### DQ Run Success
- **Subject**: `✅ Data Quality Report Completed - [Facility Name] ([Period])`
- **Content**: Professional HTML layout with:
  - Summary statistics (records processed, issues found, completeness %)
  - Data elements breakdown
  - Top issues (if any)
  - Destination sync status

#### DQ Run Failure
- **Subject**: `❌ Data Quality Report Failed - [Facility Name] ([Period])`
- **Content**: Error details and contact information

#### Dataset Comparison
- **Subject**: `⚠️ Dataset Comparison [Status] - [Facility Name]`
- **Content**: Comparison results with:
  - Datasets compared
  - Match/mismatch statistics
  - Data consistency rate

### WhatsApp Templates

Concise text messages with key information:
- Status icon (✅/⚠️/❌)
- Facility name and period
- Key metrics
- Brief summary

## Usage Examples

### Automatic Notifications

Notifications are automatically sent when:

1. **DQ Run Completes**:
   ```typescript
   const result = await runDQ(params)
   // Notifications automatically sent to facilities matching orgUnit
   ```

2. **Dataset Comparison Completes**:
   ```typescript
   const comparison = await compareDatasets(params)
   // Notifications automatically sent to facility matching orgUnit
   ```

### Manual Notifications

```typescript
import { notificationManager } from './notifications/notificationManager'

// Send DQ notifications
const result = await notificationManager.sendDQRunNotifications('OU123456', dqResult)

// Send comparison notifications  
const result = await notificationManager.sendComparisonNotifications('OU123456', comparisonResult)
```

### Facility Management

```typescript
import { facilityStore } from './notifications/facilityStore'

// Add a facility
const facility = facilityStore.addFacility({
  name: 'District Hospital',
  orgUnitId: 'OU789012',
  email: ['admin@hospital.org'],
  whatsapp: ['+1234567890'],
  enabled: true,
  notificationPreferences: {
    dqRuns: true,
    comparisons: false,
    emailEnabled: true,
    whatsappEnabled: true
  }
})

// Get facilities for org unit
const facilities = facilityStore.getFacilitiesByOrgUnits(['OU123456'])
```

## Data Storage

Facility data is stored in JSON format at:
- `data/facilities.json` - Facility contacts and preferences

Example facility record:
```json
{
  "id": "facility_1642694400000_abc123def",
  "name": "District Health Center",
  "orgUnitId": "OU123456",
  "email": ["manager@dhc.org", "data@dhc.org"],
  "whatsapp": ["+1234567890"],
  "enabled": true,
  "notificationPreferences": {
    "dqRuns": true,
    "comparisons": true,
    "emailEnabled": true,
    "whatsappEnabled": true
  },
  "createdAt": "2024-01-20T12:00:00.000Z",
  "updatedAt": "2024-01-20T12:00:00.000Z"
}
```

## Error Handling

The notification system is designed to be resilient:

1. **Service Failures**: DQ runs continue even if notifications fail
2. **Partial Failures**: Individual notification failures don't stop the batch
3. **Configuration Issues**: Services gracefully disable when misconfigured
4. **Rate Limiting**: Built-in delays between messages
5. **Detailed Logging**: Comprehensive error tracking and success metrics

## Monitoring

Check notification status via:

1. **Console Logs**: Detailed operation logs with timestamps
2. **API Response**: Notification results included in success responses
3. **Test Endpoints**: Verify service configuration and connectivity
4. **Facility Stats**: Monitor configured facilities and preferences

## Security Considerations

1. **Credentials**: Store sensitive config in environment variables
2. **Data Protection**: Facility contact information stored locally
3. **API Security**: All endpoints require backend API access
4. **Rate Limiting**: Built-in delays prevent abuse
5. **Error Handling**: No sensitive information exposed in error messages

## Troubleshooting

### Email Issues
- Check SMTP credentials and server settings
- Verify app password for Gmail (not regular password)
- Test connectivity with `/api/notifications/test-services`

### WhatsApp Issues
- Ensure Twilio account is verified and funded
- WhatsApp Business number must be approved
- Phone numbers must include country code (+1234567890)

### No Notifications Sent
- Check facility configuration for target org unit
- Verify notification preferences are enabled
- Ensure contacts are properly formatted
- Check console logs for detailed error messages

## Future Enhancements

Potential improvements:
- SMS notifications via Twilio
- Slack/Teams integration
- Notification scheduling and queuing
- Advanced template customization
- Notification analytics and reporting
- Multi-language support