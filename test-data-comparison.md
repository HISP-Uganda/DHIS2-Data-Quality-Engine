# Data Comparison Testing Guide

## Issues Fixed:

1. **404 Error**: The DataComparisonModal was trying to fetch data directly from `/api/dataValueSets.json` which doesn't exist on the backend.
2. **Missing Backend Endpoint**: Created `/api/get-dataset-data` endpoint to properly fetch data values from DHIS2.
3. **Incorrect API URLs**: Fixed comparison stats tracking to use the correct backend URL.
4. **Name Resolution**: Added proper metadata fetching to show real names instead of UIDs in comparison results.

## Changes Made:

### Backend (`dq-engine/src/index.ts`):
1. Added `/api/get-dataset-data` endpoint to fetch data values from a specific dataset
2. Enhanced `/api/compare-datasets` with better logging and name resolution
3. Added metadata fetching to resolve UIDs to display names

### Frontend (`src/components/DataComparisonModal.tsx`):
1. Fixed data fetching to use the new backend endpoint instead of direct DHIS2 calls
2. Fixed comparison stats tracking URL to use backend server
3. Updated to use proper API base URL helper function

### API Layer (`src/api.ts`):
1. Added `getDatasetData` function with proper TypeScript types

## Testing Steps:

1. Start the DQ engine backend:
   ```bash
   cd dq-engine && yarn start
   ```

2. Start the frontend:
   ```bash
   yarn start
   ```

3. Open the app and navigate to DQ Engine tab

4. Configure source credentials and run a DQ process that posts data to a destination

5. When the comparison modal opens:
   - It should no longer show 404 errors
   - Data should be fetched properly from the backend
   - Real names should be displayed instead of UIDs
   - The comparison table should show actual data values

## Expected Results:

- ✅ No 404 errors in browser console
- ✅ Data comparison table shows actual values
- ✅ Data elements show display names instead of UIDs
- ✅ Organization units show display names instead of UIDs
- ✅ Proper error handling when no data is available
- ✅ Detailed logging in backend console for debugging

## Debug Information:

Check the backend console for logs like:
- `[DQ API] ✅ Found X data values for dataset Y`
- `[DQ API] ✅ Resolved org unit name: Name (UID)`
- `[DQ API] ✅ Loaded X data element names for comparison`

If no data is found, check:
1. Dataset contains data for the specified period
2. Organization unit has access to the dataset
3. Data has been completed/approved in DHIS2
4. User credentials have proper permissions