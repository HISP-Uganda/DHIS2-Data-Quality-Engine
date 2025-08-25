# Notification UI Usage Guide

## Overview

The notification system UI has been integrated into the DQ Engine Control Panel as a new "Notifications" tab. This allows users to manage facility contacts and send data quality notifications directly from the web interface.

## Accessing the Notification Interface

1. Navigate to the **DQ Engine Control Panel**
2. Click on the **"Notifications"** tab (bell icon)
3. You'll see the Notification Management interface

## Key Features

### 🏥 Facility Management

#### Adding a New Facility
1. Click the **"Add Facility"** button
2. Fill in the required information:
   - **Facility Name**: Display name for the facility
   - **Organization Unit ID**: DHIS2 org unit identifier
   - **Email Addresses**: Comma-separated list of email contacts
   - **WhatsApp Numbers**: Comma-separated phone numbers with country codes
3. Configure notification preferences:
   - ✅ **Data Quality Run Notifications**: Receive notifications after DQ runs
   - ✅ **Dataset Comparison Notifications**: Receive notifications after comparisons
   - ✅ **Enable Email Notifications**: Allow email delivery
   - ✅ **Enable WhatsApp Notifications**: Allow WhatsApp delivery
4. Set facility status (Enabled/Disabled)
5. Click **"Create Facility"**

#### Email Format Examples
```
manager@hospital.org
data@facility.com, admin@facility.com
quality@health.gov
```

#### WhatsApp Number Format Examples
```
+1234567890
+256781234567, +256701234567
+254712345678
```

#### Editing Existing Facilities
1. Click the **edit icon** (pencil) next to any facility
2. Modify the information as needed
3. Click **"Update Facility"**

#### Sending Test Notifications
1. Click the **send icon** (paper plane) next to any enabled facility
2. A test notification will be sent to demonstrate the system
3. Check the toast notification for delivery status

### ⚙️ Service Configuration

#### Email Service Setup (SMTP)
1. Click **"Configure Services"** button
2. In the Email Configuration section, enter:
   - **SMTP Host**: e.g., `smtp.gmail.com`
   - **SMTP Port**: e.g., `587`
   - **Username**: Your email address
   - **Password**: Your email app password (not regular password!)
   - **From Address**: The sender email address
3. Click **"Save Email Configuration"**

#### WhatsApp Service Setup (Twilio)
1. In the WhatsApp Configuration section, enter:
   - **Account SID**: Your Twilio Account SID
   - **Auth Token**: Your Twilio Auth Token  
   - **WhatsApp From Number**: Your Twilio WhatsApp number (format: `whatsapp:+1234567890`)
2. Click **"Save WhatsApp Configuration"**

### 📊 Service Status Monitoring

The UI displays real-time status for both services:

- **🟢 Connected**: Service is configured and working
- **🟡 Configured**: Service is set up but connection failed
- **🔴 Not Configured**: Service needs to be configured

### 🚀 Manual Notification Triggers

#### From the Manual Configurations Tab
1. Set up your DQ run parameters as usual
2. Select organization units
3. Use the **"Send Test Notification"** button next to "Trigger Now"
4. This sends a test notification to facilities matching the selected org units

#### From the Notifications Tab
1. Find the facility you want to test
2. Click the **send icon** next to the facility
3. A sample DQ notification will be sent immediately

## Notification Behavior

### Automatic Notifications
- **After DQ Runs**: Notifications automatically sent when manual or scheduled DQ runs complete
- **After Comparisons**: Notifications sent when dataset comparisons finish
- **Both Success & Failure**: Facilities receive notifications for both successful and failed runs

### Manual Notifications
- **Test Button**: Sends sample notifications with dummy data
- **Immediate Delivery**: No waiting for actual DQ runs
- **Status Feedback**: Toast notifications show delivery results

## Example Workflow

### 1. Initial Setup
```
1. Configure email SMTP settings
2. Configure WhatsApp Twilio settings  
3. Add your first facility with contacts
4. Test the notification delivery
```

### 2. Daily Usage
```
1. Run DQ checks from Manual Configurations tab
2. Notifications automatically sent to relevant facilities
3. Use "Send Test Notification" for manual testing
4. Monitor service status indicators
```

### 3. Managing Facilities
```
1. Add new facilities as they come online
2. Update contact information as staff changes
3. Enable/disable facilities as needed
4. Configure notification preferences per facility
```

## Tips & Best Practices

### 📧 Email Setup
- Use **app passwords** for Gmail, not your regular password
- Test with a single facility first before adding many
- Check spam folders if emails don't arrive
- Use a dedicated email address for notifications

### 📱 WhatsApp Setup  
- Ensure your Twilio account is verified and funded
- WhatsApp Business approval may take time
- Test with your own number first
- Include country codes in all phone numbers

### 🏥 Facility Management
- Use descriptive facility names for easy identification
- Keep org unit IDs synchronized with DHIS2
- Regularly update contact information
- Disable facilities during maintenance periods

### 🔧 Troubleshooting
- Check service status indicators first
- Review browser console for error messages
- Verify org unit IDs match DHIS2 exactly
- Test individual services before bulk operations

## Error Messages & Solutions

| Error | Solution |
|-------|----------|
| "Failed to configure email" | Check SMTP credentials and server settings |
| "Failed to send WhatsApp" | Verify Twilio account and phone number format |
| "No facilities configured" | Add at least one facility with contacts |
| "Facility not found" | Check org unit ID matches DHIS2 |
| "Service not configured" | Complete configuration setup first |

## API Integration Notes

The UI integrates with these backend endpoints:
- `GET /api/facilities` - List all facilities
- `POST /api/facilities` - Create new facility
- `PUT /api/facilities/:id` - Update facility
- `DELETE /api/facilities/:id` - Delete facility
- `POST /api/notifications/configure-email` - Configure email
- `POST /api/notifications/configure-whatsapp` - Configure WhatsApp
- `GET /api/notifications/test-services` - Test service status
- `POST /api/notifications/test-dq` - Send test notification

The system is now ready for users to manage notification contacts and trigger data quality notifications directly from the web interface!