// Quick test script to verify the notification system is working
// Run with: node test_notifications.js

const API_BASE = 'http://localhost:4000'

async function testAPI(endpoint, method = 'GET', body = null) {
    console.log(`\n🧪 Testing ${method} ${endpoint}`)
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        }
        if (body) options.body = JSON.stringify(body)
        
        const response = await fetch(`${API_BASE}${endpoint}`, options)
        const data = await response.json()
        
        if (response.ok) {
            console.log(`✅ Success:`, data)
        } else {
            console.log(`❌ Error:`, data)
        }
        return data
    } catch (error) {
        console.log(`❌ Network Error:`, error.message)
        return null
    }
}

async function runTests() {
    console.log('🚀 Starting notification system tests...\n')
    
    // Test 1: Check if backend is running
    await testAPI('/')
    
    // Test 2: List existing facilities
    await testAPI('/api/facilities')
    
    // Test 3: Create a new facility
    const newFacility = {
        name: 'Test Health Center',
        orgUnitId: 'TEST789',
        email: ['admin@healthcenter.org', 'data@healthcenter.org'],
        whatsapp: ['+256701234567'],
        enabled: true,
        notificationPreferences: {
            dqRuns: true,
            comparisons: true,
            emailEnabled: true,
            whatsappEnabled: true
        }
    }
    
    const createdFacility = await testAPI('/api/facilities', 'POST', newFacility)
    
    // Test 4: List facilities again to see the new one
    await testAPI('/api/facilities')
    
    // Test 5: Test service status
    await testAPI('/api/notifications/test-services')
    
    // Test 6: Send test notification (if facility was created)
    if (createdFacility && createdFacility.id) {
        await testAPI('/api/notifications/test-dq', 'POST', { orgUnitId: 'TEST789' })
    }
    
    console.log('\n🎉 Tests completed!')
    console.log('\nNext steps:')
    console.log('1. Open http://localhost:3000 in your browser')
    console.log('2. Navigate to DQ Engine → Notifications tab')
    console.log('3. You should see the test facility listed')
    console.log('4. Try adding a new facility through the UI')
    console.log('5. Configure email/WhatsApp services if needed')
}

// Add a simple fetch polyfill for older Node versions
if (!global.fetch) {
    global.fetch = require('node-fetch')
}

runTests().catch(console.error)