# Configuration Management & Troubleshooting Guide

## 🚀 **Configuration Management Now Available!**

I've successfully implemented a comprehensive configuration management system that addresses both the "Trigger Now" button issue and the configuration saving workflow.

---

## 💾 **How to Save Configurations**

### **Method 1: From Main DQ Form (NEW!)**
1. Fill out your DQ form completely:
   - Source URL, credentials
   - Data elements
   - Dataset
   - Period, org unit
   - Optional destination settings

2. Click the **green "Save as Config"** button (next to "Trigger Now")

3. Enter a name when prompted (e.g., "Monthly HMIS Check")

4. Configuration is saved instantly! ✅

### **Method 2: From Data Comparison Modal**
1. Run a successful DQ process
2. Open the Data Comparison modal 
3. Configure datasets and data element mappings
4. Click "Save Config" in the modal header
5. Enter name and description

---

## ⚡ **How to Use Saved Configurations**

### **Quick Run Widget**
Located in the main DQ Engine tab (below the form):

1. **Select Configuration**: Choose from dropdown
2. **Enter Parameters**: Org Unit ID and Period
3. **Click "Quick Run"**: Executes instantly!

### **Load in Comparison Modal**
1. Click "Load Config" in comparison modal
2. Select saved configuration
3. Click "Quick Run Comparison"

---

## 🔧 **Troubleshooting the "Trigger Now" Button**

The infinite loading issue occurs when the backend DQ engine takes too long or encounters an error. Here are the solutions:

### **Check Backend Status**
```bash
# 1. Ensure backend is running
cd dq-engine && yarn start

# 2. Check if it's responding
curl http://localhost:4000/api/comparison-configs
```

### **Check Browser Console**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Click "Trigger Now"
4. Look for error messages

### **Check Network Tab**
1. Open Developer Tools → Network tab
2. Click "Trigger Now"
3. Look for the `/api/run-dq` request
4. Check if it's:
   - ❌ **Failed**: Backend not running or error
   - ⏳ **Pending**: Taking too long (timeout after 2 minutes)
   - ✅ **Completed**: Should work normally

### **Common Solutions**

#### **Backend Not Running**
```bash
cd dq-engine
yarn start
```

#### **Port Conflicts**
```bash
# Check if port 4000 is in use
lsof -i :4000

# Kill process if needed
kill -9 <PID>
```

#### **Authentication Issues**
- Verify DHIS2 credentials are correct
- Check if DHIS2 instance is accessible
- Test with simple curl request

#### **Long Processing Time**
The DQ engine may take time for large datasets:
- Wait up to 2 minutes
- Check backend console for progress logs
- Consider reducing data elements or org units

---

## 📊 **Configuration Types**

### **DQ Run Configuration**
Saves the main DQ form settings:
- Source DHIS2 connection
- Data elements and dataset
- Optional destination settings
- Data element mappings

### **Comparison Configuration** 
Saves comparison modal settings:
- Multiple datasets
- Data element group mappings
- Comparison logic

---

## 🧪 **Testing Steps**

### **1. Test Configuration Saving**
```bash
# Start backend
cd dq-engine && yarn start

# Start frontend  
yarn start
```

1. Fill out DQ form completely
2. Click "Save as Config"
3. Enter name: "Test Config"
4. Should see success message

### **2. Test Quick Run**
1. Look for "Quick Run Configurations" widget
2. Select "Test Config" from dropdown
3. Enter org unit and period
4. Click "Quick Run Comparison"
5. Should see success message

### **3. Test Trigger Now**
1. Fill out DQ form
2. Click "Trigger Now"
3. Should see processing messages
4. If it loads forever, check backend console

---

## 🔍 **Debugging Tips**

### **Backend Console Logs**
Look for these patterns:
```
[DQ API] ========== NEW REQUEST ==========
[DQ API] POST /api/run-dq received
[Engine] Step 1/6: Fetching metadata
```

### **Frontend Console Logs**
```
[DQEngineView] Trigger Now button clicked!
[api.ts] → POST /api/run-dq
[api.ts] ← Response received, status: 200
```

### **Common Error Messages**

#### **"No data found"**
- Check if data exists in DHIS2 for that period
- Verify org unit has data
- Use "Check Data Availability" button

#### **"Authentication failed"**  
- Verify DHIS2 credentials
- Check DHIS2 URL is correct
- Test manual login to DHIS2

#### **"Connection refused"**
- Backend not running on port 4000
- Network connectivity issues
- CORS problems

---

## 🎯 **Expected Behavior**

### **Successful Configuration Save**
✅ Green success toast  
✅ Configuration appears in Quick Run dropdown  
✅ Can be loaded and executed  

### **Successful DQ Run**
✅ "Trigger Now" shows loading spinner  
✅ Progress messages appear  
✅ Completes with success/error message  
✅ Shows comparison modal if destination configured  

### **Quick Run Success**
✅ Executes without requiring form fill  
✅ Shows progress feedback  
✅ Updates "Last Run" timestamp  

---

## 🛠️ **File Locations**

### **Configuration Storage**
```
dq-engine/data/comparison-configs/configurations.json
```

### **Key Components**
```
src/components/DQEngineView.tsx           # Main form + Save button
src/components/QuickRunConfigs.tsx        # Quick run widget
src/components/DataComparisonModal.tsx    # Comparison modal
dq-engine/src/configStorage.ts           # Backend storage
dq-engine/src/index.ts                   # API endpoints
```

---

## ✅ **Success Indicators**

1. **Save Button Available**: Green "Save as Config" button visible when form is complete
2. **Quick Run Widget**: Purple widget appears below main form
3. **Configuration List**: Saved configs appear in dropdown
4. **Instant Execution**: Quick run works without filling form
5. **Persistent Storage**: Configs survive app restarts

The configuration management system is now fully functional and should resolve both the infinite loading issue and provide an efficient workflow for repetitive DQ operations!