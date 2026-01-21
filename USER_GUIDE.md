# IWS-App User Guide
## Data Quality Dashboard & Management System for DHIS2

**Version:** 1.0.0
**Last Updated:** November 2024

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Data Quality (DQ) Engine](#4-data-quality-dq-engine)
5. [Dataset Comparison](#5-dataset-comparison)
6. [Configuration Management](#6-configuration-management)
7. [Notification System](#7-notification-system)
8. [Schedule Management](#8-schedule-management)
9. [Advanced Features](#9-advanced-features)
10. [Troubleshooting](#10-troubleshooting)
11. [Best Practices](#11-best-practices)
12. [FAQ](#12-faq)

---

## 1. Introduction

### 1.1 What is IWS-App?

IWS-App (Integrated Web System Application) is a comprehensive **Data Quality Dashboard and Management System** designed for DHIS2 (District Health Information Software 2) environments. It helps health information managers ensure data accuracy, identify discrepancies, and maintain data quality across single or multiple DHIS2 instances.

![IWS-App Welcome Screen](docs/images/01-welcome-screen.png)

### 1.2 Key Capabilities

- **Data Quality Validation:** Validate health data against configurable rules
- **Cross-Instance Data Transfer:** Retrieve data from one DHIS2 instance and post to another
- **Dataset Comparison:** Compare the same data elements across multiple datasets to identify mismatches
- **Automated Notifications:** Send alerts via Email, SMS, and WhatsApp when data issues are detected
- **Configuration Management:** Save and reuse data quality workflows
- **Real-Time Analytics:** Monitor data quality metrics and trends
- **Intelligent Mapping:** Automatically map corresponding data elements across different datasets

### 1.3 Who Should Use This Guide?

- Health Information Managers
- DHIS2 Administrators
- Data Quality Officers
- Public Health Monitoring Teams
- IT Support Staff managing DHIS2 deployments

### 1.4 System Requirements

**Browser Support:**
- Chrome 90+ (Recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

**Access Requirements:**
- Active DHIS2 instance credentials
- Appropriate DHIS2 user permissions (read data, write data)
- Network connectivity to DHIS2 server(s)

---

## 2. Getting Started

### 2.1 Accessing the Application

1. Open your web browser
2. Navigate to the IWS-App URL provided by your administrator
3. You will be automatically authenticated via DHIS2 session

![Login Screen](docs/images/02-login.png)

### 2.2 Application Interface Overview

The application consists of three main sections accessible via tabs at the top:

![Main Navigation](docs/images/03-main-navigation.png)

1. **Dashboard Tab:** Real-time analytics and monitoring
2. **DQ Engine Tab:** Data quality validation and comparison tools
3. **Metadata Assessment Tab:** (Future feature)

### 2.3 Understanding the Layout

**Top Navigation Bar:**
- Application logo and name
- Main tabs (Dashboard, DQ Engine, Metadata Assessment)
- User profile indicator (top-right)

**Content Area:**
- Dynamic content based on selected tab
- Forms, tables, charts, and data displays

**Status Indicators:**
- Loading spinners during operations
- Toast notifications for success/error messages
- Progress trackers for long-running operations

![Application Layout](docs/images/04-application-layout.png)

---

## 3. Dashboard Overview

### 3.1 Accessing the Dashboard

Click the **"Dashboard"** tab in the top navigation to view real-time analytics.

![Dashboard Tab](docs/images/05-dashboard-tab.png)

### 3.2 Dashboard Components

#### 3.2.1 Summary Statistics Cards

At the top of the dashboard, you'll see key metrics:

![Summary Statistics](docs/images/06-summary-stats.png)

- **Total DQ Runs:** Total number of data quality checks executed
- **Success Rate:** Percentage of successful DQ runs
- **Avg Completeness:** Average data completeness across all runs
- **Validation Errors:** Total number of data validation errors detected
- **Total Comparisons:** Number of dataset comparisons performed
- **Regional Stats:** Data quality metrics by region/org unit

**Auto-Refresh:** Dashboard updates automatically every 30 seconds.

#### 3.2.2 Charts and Visualizations

**Success Rate Over Time (Line Chart):**
Shows the trend of successful vs. failed DQ runs over the past 7 days.

![Success Rate Chart](docs/images/07-success-rate-chart.png)

**Data Completeness Distribution (Pie Chart):**
Displays the percentage breakdown of data completeness levels.

![Completeness Distribution](docs/images/08-completeness-pie.png)

**Validation Errors Trend (Bar Chart):**
Shows error counts by type (range errors, consistency errors, outliers, missing data).

![Validation Errors Chart](docs/images/09-validation-errors-bar.png)

**Comparison Results Breakdown (Stacked Bar Chart):**
Displays valid, mismatched, and missing records from dataset comparisons.

![Comparison Results](docs/images/10-comparison-results.png)

#### 3.2.3 Activity Tables

**Recent DQ Runs:**
Lists the most recent data quality executions with details:
- Configuration name
- Source dataset
- Organization unit
- Period
- Status (Success/Failed)
- Validation errors count
- Timestamp

![Recent DQ Runs Table](docs/images/11-recent-dq-runs.png)

**Recent Comparisons:**
Shows recent dataset comparison activities with:
- Datasets compared
- Organization unit
- Period
- Valid records count
- Mismatch count
- Missing records count
- Timestamp

![Recent Comparisons Table](docs/images/12-recent-comparisons.png)

### 3.3 Using Dashboard Filters

Filter dashboard data by:
- Date range (last 7 days, 30 days, 90 days)
- Organization unit
- Dataset

![Dashboard Filters](docs/images/13-dashboard-filters.png)

### 3.4 Exporting Dashboard Data

Click the **"Export Report"** button to download dashboard data as CSV or Excel.

![Export Dashboard](docs/images/14-export-dashboard.png)

---

## 4. Data Quality (DQ) Engine

The DQ Engine is the core feature for validating and transferring health data.

### 4.1 Accessing DQ Engine

1. Click the **"DQ Engine"** tab in the main navigation
2. You'll see sub-tabs:
   - **Manual DQ Run**
   - **Saved Configurations**
   - **Quick Run**
   - **Notifications**
   - **Schedules**

![DQ Engine Navigation](docs/images/15-dq-engine-nav.png)

### 4.2 Manual DQ Run

#### 4.2.1 Overview

Use this interface to configure and execute a one-time data quality check with optional data transfer to another DHIS2 instance.

![Manual DQ Run Interface](docs/images/16-manual-dq-interface.png)

#### 4.2.2 Step 1: Configure Source System

**1. Enter Source DHIS2 Credentials:**

![Source Credentials](docs/images/17-source-credentials.png)

- **DHIS2 URL:** Full URL of the source DHIS2 instance (e.g., `https://play.dhis2.org/40.0`)
- **Username:** Your DHIS2 username
- **Password:** Your DHIS2 password
- Click **"Validate Credentials"** button

**Success Indicator:**
Green checkmark appears with message: "Authentication successful! Logged in as [Your Name]"

![Credential Validation Success](docs/images/18-credential-success.png)

**2. Select Dataset:**

After successful authentication, the dataset dropdown populates automatically.

![Dataset Selection](docs/images/19-dataset-selection.png)

- Click the **"Select Dataset"** dropdown
- Search by typing dataset name
- Click to select your desired dataset (e.g., "ANC Monthly Report")

**3. Select Organization Unit(s):**

![Organization Unit Picker](docs/images/20-org-unit-picker.png)

- Click **"Select Organization Units"** button
- A hierarchical tree selector opens
- Navigate the tree by expanding parent nodes (click arrow icons)
- Check the boxes next to organization units you want to include
- Use the search box to quickly find specific units
- Click **"Done"** to confirm selection

**Tip:** You can select multiple organization units at different levels.

![Org Unit Tree Selection](docs/images/21-org-unit-tree.png)

**4. Select Data Elements:**

![Data Element Selection](docs/images/22-data-elements.png)

- After dataset selection, all data elements load
- Use the search box to filter by name
- Check individual data elements or click **"Select All"**
- Click **"Deselect All"** to clear selections
- Selected count appears at the top

**5. Select Period:**

![Period Selector](docs/images/23-period-selector.png)

- Click the **"Select Period"** button
- A DHIS2-style period selector modal opens
- Choose period type: **Monthly**, **Quarterly**, or **Yearly**
- For Monthly: Click on desired months in the visual calendar
- For Quarterly: Click Q1, Q2, Q3, or Q4
- For Yearly: Select the year
- Click **"Confirm Selection"**

![Period Selector Modal](docs/images/24-period-modal.png)

**Example Period Formats:**
- Monthly: `202401` (January 2024)
- Quarterly: `2024Q1` (Q1 2024)
- Yearly: `2024` (Year 2024)

#### 4.2.3 Step 2: Configure Destination System (Optional)

If you want to post validated data to another DHIS2 instance, configure the destination.

![Destination Configuration](docs/images/25-destination-config.png)

**Toggle:** Click the **"Post to Destination DHIS2"** checkbox to enable destination configuration.

**1. Enter Destination DHIS2 Credentials:**

![Destination Credentials](docs/images/26-destination-credentials.png)

- **DHIS2 URL:** Destination instance URL
- **Username:** Destination username
- **Password:** Destination password
- Click **"Validate Credentials"**

**2. Select Destination Dataset:**

![Destination Dataset](docs/images/27-destination-dataset.png)

- Choose the dataset where data should be posted
- May be different from source dataset

**3. Select Destination Organization Unit(s):**

![Destination Org Units](docs/images/28-destination-org-units.png)

- Select target organization unit(s) using the tree selector
- Can map multiple source org units to corresponding destination org units

**4. Map Data Elements:**

This is the most critical step when datasets differ between source and destination.

![Data Element Mapping](docs/images/29-data-element-mapping.png)

**Manual Mapping:**
- For each source data element (left column), select the corresponding destination data element (right dropdown)
- Search within dropdowns to find matching elements

**Automatic Mapping:**
- Click **"Auto-Map Data Elements"** button
- The system uses intelligent algorithms to suggest mappings based on:
  - Name similarity (Levenshtein distance, Jaro-Winkler)
  - Common health indicator patterns (e.g., "Live Births", "Maternal Deaths")
  - Semantic similarity

![Auto-Mapping Results](docs/images/30-auto-mapping.png)

**Review Auto-Mapped Results:**
- Green highlights indicate confident matches
- Yellow highlights indicate uncertain matches
- Red indicates no match found
- Review and adjust manually as needed

#### 4.2.4 Step 3: Run DQ Check

Once all configurations are complete:

1. Click the **"Run DQ Check"** button at the bottom

![Run DQ Button](docs/images/31-run-dq-button.png)

2. A progress tracker appears showing stages:
   - Authenticating...
   - Retrieving data...
   - Validating data...
   - Posting data... (if destination configured)
   - Finalizing...

![DQ Progress Tracker](docs/images/32-dq-progress.png)

#### 4.2.5 Step 4: Review Results

**Success Screen:**

![DQ Success Results](docs/images/33-dq-success.png)

**Results Summary Includes:**
- **Total Records Processed:** Number of data values retrieved
- **Valid Records:** Records passing all validation rules
- **Validation Errors:** Count by type (range, consistency, outliers, missing)
- **Data Completeness:** Percentage of expected data present
- **Records Posted:** If destination was configured, count of posted data values
- **Execution Time:** Duration of the DQ run

**Validation Errors Table:**

If errors were detected, a detailed table appears:

![Validation Errors Table](docs/images/34-validation-errors-table.png)

**Table Columns:**
- **Data Element:** Name of the data element with error
- **Organization Unit:** Facility/unit where error occurred
- **Period:** Period of the error
- **Value:** Actual value causing the error
- **Error Type:** Range Error, Consistency Error, Outlier, Missing Data
- **Severity:** Error, Warning, Info
- **Message:** Description of the validation issue

**Actions:**
- **Export Errors:** Download error report as CSV
- **View Details:** Click a row to see full error context
- **Filter Errors:** Filter by error type, severity, or org unit

**Comparison Modal (Auto-Opens):**

If data was posted to a destination, the Dataset Comparison modal automatically opens to compare source and destination data.

![Auto-Opened Comparison](docs/images/35-auto-comparison.png)

---

### 4.3 Saved Configurations

Save frequently-used DQ configurations for quick access.

#### 4.3.1 Viewing Saved Configurations

Click the **"Saved Configurations"** sub-tab.

![Saved Configurations List](docs/images/36-saved-configs.png)

**Configuration Cards Display:**
- Configuration name
- Source dataset
- Destination dataset (if applicable)
- Data elements count
- Last run timestamp
- Active/Inactive status
- Action buttons (Edit, Run, Delete)

#### 4.3.2 Creating a New Configuration

1. Click **"Create New Configuration"** button

![Create Configuration Button](docs/images/37-create-config-button.png)

2. The **Configuration Wizard** opens

![Configuration Wizard](docs/images/38-config-wizard.png)

**Wizard Steps:**

**Step 1: Basic Information**
- Configuration Name (e.g., "Monthly ANC Data Transfer")
- Description (optional)

![Config Wizard Step 1](docs/images/39-wizard-step1.png)

**Step 2: Source Configuration**
- Source DHIS2 credentials
- Dataset selection
- Data element selection
- Default organization unit (optional)
- Default period (optional)

![Config Wizard Step 2](docs/images/40-wizard-step2.png)

**Step 3: Destination Configuration (Optional)**
- Destination DHIS2 credentials
- Destination dataset
- Data element mappings

![Config Wizard Step 3](docs/images/41-wizard-step3.png)

**Step 4: Validation Rules (Optional)**
- Select pre-defined validation rules to apply
- Create custom validation rules

![Config Wizard Step 4](docs/images/42-wizard-step4.png)

**Step 5: Notification Preferences (Optional)**
- Enable notifications
- Select facilities to notify
- Choose notification channels (Email, SMS, WhatsApp)

![Config Wizard Step 5](docs/images/43-wizard-step5.png)

**Step 6: Review & Save**
- Review all settings
- Click **"Save Configuration"**

![Config Wizard Step 6](docs/images/44-wizard-step6.png)

#### 4.3.3 Running a Saved Configuration

**From Configuration Card:**

1. Locate the configuration card
2. Click the **"Run"** button

![Run from Card](docs/images/45-run-from-card.png)

3. A modal appears to specify runtime parameters:
   - Organization Unit (override default)
   - Period (override default)

![Runtime Parameters Modal](docs/images/46-runtime-params.png)

4. Click **"Execute"**
5. Progress tracker and results appear as in manual DQ run

#### 4.3.4 Editing a Configuration

1. Click the **"Edit"** button on a configuration card
2. Configuration Wizard opens with pre-filled values
3. Modify as needed
4. Click **"Update Configuration"**

![Edit Configuration](docs/images/47-edit-config.png)

#### 4.3.5 Deleting a Configuration

1. Click the **"Delete"** button on a configuration card
2. Confirmation dialog appears: "Are you sure you want to delete this configuration?"
3. Click **"Confirm"** to delete

![Delete Confirmation](docs/images/48-delete-confirmation.png)

#### 4.3.6 Activating/Deactivating Configurations

Toggle the **Active/Inactive** switch on configuration cards.

![Toggle Active Status](docs/images/49-toggle-active.png)

- **Active:** Configuration can be run manually or scheduled
- **Inactive:** Configuration is hidden from quick run dropdowns and schedules won't execute

---

### 4.4 Quick Run

Quickly execute a saved configuration with minimal inputs.

#### 4.4.1 Accessing Quick Run

Click the **"Quick Run"** sub-tab.

![Quick Run Interface](docs/images/50-quick-run.png)

#### 4.4.2 Using Quick Run

**Step 1: Select Configuration**

![Select Configuration Dropdown](docs/images/51-quick-run-select.png)

- Click the **"Select Configuration"** dropdown
- Search or scroll to find your saved configuration
- Click to select

**Step 2: Specify Parameters**

![Quick Run Parameters](docs/images/52-quick-run-params.png)

- **Organization Unit:** Click to select from tree picker
- **Period:** Click to select using period selector

**Step 3: Execute**

Click **"Quick Run"** button.

![Quick Run Execute](docs/images/53-quick-run-execute.png)

**Results:**
Progress tracker and results appear just like manual DQ runs.

---

## 5. Dataset Comparison

Compare data across multiple datasets to identify discrepancies and ensure consistency.

### 5.1 When to Use Dataset Comparison

- **Scenario 1:** You posted data from one DHIS2 instance to another and want to verify accuracy
- **Scenario 2:** Same logical data exists in multiple datasets (e.g., ANC data in monthly and quarterly reports)
- **Scenario 3:** You want to identify which dataset has the "correct" values when conflicts exist

### 5.2 Accessing Dataset Comparison

**Method 1: Automatic (After DQ Run with Posting)**

If you ran a DQ check with destination posting, the comparison modal automatically opens.

![Auto-Opened Comparison Modal](docs/images/54-auto-comparison-modal.png)

**Method 2: Manual (From Configuration Homepage)**

1. Navigate to **"Saved Configurations"**
2. Click **"Compare Datasets"** button

![Manual Comparison Button](docs/images/55-manual-comparison-button.png)

### 5.3 Comparison Modal Interface

![Comparison Modal Overview](docs/images/56-comparison-modal-overview.png)

**Modal Sections:**
1. **Header:** Title and close button
2. **Dataset Selection:** Choose 2-3 datasets to compare
3. **Data Element Groups:** Logical groupings of corresponding elements
4. **Comparison Parameters:** Org unit and period selection
5. **Action Buttons:** Run, Save, Export

### 5.4 Step 1: Select Datasets to Compare

![Select Datasets](docs/images/57-select-datasets.png)

**Instructions:**
1. Click **"Add Dataset"** button
2. A dataset selector appears
3. Choose dataset from dropdown
4. Repeat to add 2-3 datasets total

**Note:** You can compare up to 3 datasets simultaneously.

### 5.5 Step 2: Configure Data Element Groups

Data Element Groups represent logical data concepts that exist across multiple datasets (e.g., "Live Births" might appear in 3 different datasets with slightly different names).

![Data Element Groups](docs/images/58-data-element-groups.png)

#### 5.5.1 Auto-Generated Groups

After selecting datasets, the system automatically generates groups by:
- Analyzing data element names across all datasets
- Using similarity algorithms (Levenshtein, Jaro-Winkler)
- Matching common health indicator patterns

![Auto-Generated Groups](docs/images/59-auto-groups.png)

#### 5.5.2 Reviewing Auto-Generated Groups

Each group card shows:
- **Logical Element Name:** Common name for the data concept
- **Dataset Elements:** Which data element from each dataset belongs to this group
- **Confidence Score:** How confident the system is in this grouping (High, Medium, Low)

![Group Card](docs/images/60-group-card.png)

**Color Coding:**
- **Green:** High confidence match
- **Yellow:** Medium confidence, review recommended
- **Red:** Low confidence, manual review required

#### 5.5.3 Editing Groups

**To Edit a Group:**

1. Click the **"Edit"** icon on a group card

![Edit Group Icon](docs/images/61-edit-group-icon.png)

2. Edit modal opens

![Edit Group Modal](docs/images/62-edit-group-modal.png)

3. Modify:
   - **Logical Element Name:** Change the display name
   - **Dataset 1 Element:** Change which element from dataset 1
   - **Dataset 2 Element:** Change which element from dataset 2
   - **Dataset 3 Element:** Change which element from dataset 3 (if applicable)

4. Click **"Save Changes"**

#### 5.5.4 Creating New Groups

If the auto-mapping missed some data elements:

1. Click **"Create New Group"** button

![Create New Group Button](docs/images/63-create-group-button.png)

2. Fill in the group creation form:
   - Logical Element Name
   - Select data elements from each dataset dropdown

![Create Group Form](docs/images/64-create-group-form.png)

3. Click **"Add Group"**

#### 5.5.5 Deleting Groups

To remove an incorrect or unnecessary group:

1. Click the **"Delete"** icon on the group card

![Delete Group Icon](docs/images/65-delete-group-icon.png)

2. Confirm deletion in the dialog

#### 5.5.6 Predefined Health Indicator Patterns

The system recognizes common health indicator patterns:

![Predefined Patterns](docs/images/66-predefined-patterns.png)

**Examples:**
- Live Births
- Maternal Deaths
- ANC 1st Visit
- ANC 4th Visit
- Deliveries
- Postnatal Care Visits
- HIV Tests
- Malaria Cases

These patterns improve auto-mapping accuracy for standard health datasets.

### 5.6 Step 3: Set Comparison Parameters

![Comparison Parameters](docs/images/67-comparison-parameters.png)

**Required Parameters:**
1. **Organization Unit:** Select the org unit to compare data for
2. **Period:** Select the period to compare

**Note:** All datasets will be queried for the same org unit and period.

### 5.7 Step 4: Run Comparison

Click the **"Run Comparison"** button.

![Run Comparison Button](docs/images/68-run-comparison-button.png)

**Progress Indicator:**
A loading spinner appears with status messages:
- Fetching data from Dataset 1...
- Fetching data from Dataset 2...
- Analyzing differences...
- Preparing results...

![Comparison Progress](docs/images/69-comparison-progress.png)

### 5.8 Step 5: Review Comparison Results

Results are categorized into three tabs:

![Comparison Results Tabs](docs/images/70-comparison-results-tabs.png)

#### 5.8.1 Valid Records Tab

Shows data elements where **all datasets agree** (values are identical).

![Valid Records Tab](docs/images/71-valid-records-tab.png)

**Table Columns:**
- **Logical Element Name:** The data concept
- **Dataset 1 Value:** Value from first dataset
- **Dataset 2 Value:** Value from second dataset
- **Dataset 3 Value:** Value from third dataset (if applicable)
- **Status:** "Valid" (green badge)

**Interpretation:**
These records require no action—data is consistent across all datasets.

#### 5.8.2 Mismatched Records Tab

Shows data elements where **values differ across datasets**.

![Mismatched Records Tab](docs/images/72-mismatched-records-tab.png)

**Table Columns:**
- **Logical Element Name**
- **Dataset 1 Value**
- **Dataset 2 Value**
- **Dataset 3 Value**
- **Consensus Value:** Suggested "correct" value based on majority
- **Discrepancy %:** Percentage difference between values
- **Status:** "Mismatch" (red badge)

**Color Coding:**
- **Red background:** Significant discrepancy (>20%)
- **Yellow background:** Moderate discrepancy (5-20%)
- **Light orange:** Minor discrepancy (<5%)

**Actions:**

1. **Investigate:** Click on a row to see detailed metadata

![Mismatch Details Modal](docs/images/73-mismatch-details.png)

2. **Correct Data:** Use this information to update the incorrect dataset manually
3. **Export for Follow-up:** Export mismatch report for team review

#### 5.8.3 Missing Records Tab

Shows data elements that **exist in some datasets but not others**.

![Missing Records Tab](docs/images/74-missing-records-tab.png)

**Table Columns:**
- **Logical Element Name**
- **Dataset 1 Value:** Value or "Missing" badge
- **Dataset 2 Value:** Value or "Missing" badge
- **Dataset 3 Value:** Value or "Missing" badge
- **Status:** "Missing Data" (orange badge)

**Interpretation:**
- If a value exists in Dataset 1 but missing in Dataset 2, data may not have been reported or transferred
- Follow up to determine if this is expected or indicates a data gap

### 5.9 Exporting Comparison Results

Export results for further analysis or reporting.

![Export Comparison Button](docs/images/75-export-comparison-button.png)

**Steps:**
1. Click **"Export Results"** button
2. Choose export format:
   - **CSV:** For Excel analysis
   - **JSON:** For programmatic processing
   - **PDF:** For printable reports

![Export Format Selection](docs/images/76-export-format.png)

3. File downloads automatically

**Exported File Contents:**
- Summary statistics
- All valid records
- All mismatched records with discrepancy percentages
- All missing records
- Metadata (datasets compared, org unit, period, timestamp)

### 5.10 Saving Comparison Configuration

To reuse this comparison setup later:

1. Click **"Save Configuration"** button

![Save Comparison Config](docs/images/77-save-comparison-config.png)

2. Enter configuration details:
   - **Configuration Name:** (e.g., "ANC Monthly vs Quarterly Comparison")
   - **Description:** (optional)

![Save Config Form](docs/images/78-save-config-form.png)

3. Click **"Save"**

**What Gets Saved:**
- Selected datasets
- Data element groups and mappings
- Default org unit and period (optional)

**Reusing Saved Comparison:**
- Go to **"Saved Configurations"**
- Find your comparison configuration
- Click **"Run"**
- Modify org unit/period if needed
- Execute

---

## 6. Configuration Management

Centrally manage all saved DQ and comparison configurations.

### 6.1 Accessing Configuration Homepage

1. Navigate to **"DQ Engine"** tab
2. Click **"Saved Configurations"** sub-tab
3. The Configuration Homepage displays

![Configuration Homepage](docs/images/79-config-homepage.png)

### 6.2 Configuration Homepage Interface

**Layout:**
- **Search Bar:** Search configurations by name or dataset
- **Filter Dropdown:** Filter by type (DQ Run, Comparison), status (Active, Inactive)
- **Sort Dropdown:** Sort by name, date created, last run
- **Grid View:** Configuration cards in a responsive grid

![Configuration Filters](docs/images/80-config-filters.png)

### 6.3 Configuration Card Details

Each card displays:

![Configuration Card](docs/images/81-config-card.png)

**Top Section:**
- Configuration icon (type indicator)
- Configuration name
- Description

**Middle Section:**
- **Type:** DQ Run or Comparison
- **Source Dataset:** Name of source dataset
- **Destination Dataset:** Name of destination (if applicable)
- **Data Elements:** Count of elements
- **Last Run:** Timestamp of most recent execution
- **Status:** Active (green) or Inactive (gray) toggle

**Bottom Section (Action Buttons):**
- **Run:** Execute configuration
- **Edit:** Modify configuration
- **Clone:** Duplicate configuration
- **Delete:** Remove configuration

### 6.4 Searching Configurations

Use the search bar to find configurations:

![Search Configurations](docs/images/82-search-configs.png)

- Type configuration name, dataset name, or keywords
- Results filter in real-time
- Search is case-insensitive

### 6.5 Filtering Configurations

Use filter dropdown to narrow results:

![Filter Configurations](docs/images/83-filter-configs.png)

**Filter Options:**
- **All:** Show all configurations
- **DQ Run Only:** Show only DQ execution configs
- **Comparison Only:** Show only comparison configs
- **Active Only:** Show only active configs
- **Inactive Only:** Show only inactive configs

### 6.6 Sorting Configurations

Sort configurations by:

![Sort Configurations](docs/images/84-sort-configs.png)

- **Name (A-Z)**
- **Name (Z-A)**
- **Date Created (Newest First)**
- **Date Created (Oldest First)**
- **Last Run (Most Recent)**
- **Last Run (Least Recent)**

### 6.7 Cloning a Configuration

To create a copy of an existing configuration:

1. Click **"Clone"** button on the configuration card

![Clone Button](docs/images/85-clone-button.png)

2. A dialog appears: "Clone Configuration?"
3. Enter new name (auto-suggested as "Copy of [Original Name]")

![Clone Dialog](docs/images/86-clone-dialog.png)

4. Click **"Clone"**

**Use Case:** When you want to create a similar configuration with slight modifications.

### 6.8 Bulk Actions

Select multiple configurations for bulk operations:

![Bulk Selection](docs/images/87-bulk-selection.png)

1. Click checkbox in top-left corner of each card to select
2. Bulk action bar appears at the top
3. Choose action:
   - **Activate All:** Set all selected to active
   - **Deactivate All:** Set all selected to inactive
   - **Delete All:** Delete all selected (with confirmation)
   - **Export All:** Export selected configs as JSON

![Bulk Actions Bar](docs/images/88-bulk-actions.png)

---

## 7. Notification System

Automatically notify health facility staff about data quality issues via Email, SMS, or WhatsApp.

### 7.1 Accessing Notification Management

1. Navigate to **"DQ Engine"** tab
2. Click **"Notifications"** sub-tab

![Notifications Tab](docs/images/89-notifications-tab.png)

### 7.2 Notification Management Interface

The interface has two main sections:

![Notification Interface Overview](docs/images/90-notification-overview.png)

1. **Notification Services Configuration** (Top)
2. **Facility Contact Management** (Bottom)

### 7.3 Configuring Notification Services

#### 7.3.1 Email Service Configuration

![Email Service Config](docs/images/91-email-config.png)

**Required Fields:**
- **SMTP Host:** Email server hostname (e.g., `smtp.gmail.com`)
- **SMTP Port:** Port number (usually `587` for TLS or `465` for SSL)
- **Email Username:** Your email address
- **Email Password:** Email account password or app-specific password
- **From Email:** Sender email address (usually same as username)
- **From Name:** Display name for sender (e.g., "IWS-App Notifications")

**Steps:**
1. Fill in all fields
2. Click **"Save Email Configuration"**
3. Test service (see section 7.4)

**Common SMTP Settings:**

| Provider | SMTP Host | Port | TLS/SSL |
|----------|-----------|------|---------|
| Gmail | smtp.gmail.com | 587 | TLS |
| Outlook | smtp-mail.outlook.com | 587 | TLS |
| Yahoo | smtp.mail.yahoo.com | 587 | TLS |
| Office 365 | smtp.office365.com | 587 | TLS |

**Note:** Gmail requires "App Password" if 2FA is enabled. Generate at: [Google App Passwords](https://myaccount.google.com/apppasswords)

#### 7.3.2 SMS Service Configuration

![SMS Service Config](docs/images/92-sms-config.png)

**Provider Selection:**
Choose SMS provider from dropdown:
- **Twilio** (International)
- **D-Mark** (Uganda)

**Twilio Configuration:**

![Twilio Config](docs/images/93-twilio-config.png)

**Required Fields:**
- **Account SID:** Found in Twilio Console dashboard
- **Auth Token:** Found in Twilio Console dashboard
- **From Phone Number:** Your Twilio phone number (format: `+1234567890`)

**D-Mark Configuration:**

![D-Mark Config](docs/images/94-dmark-config.png)

**Required Fields:**
- **API Key:** Provided by D-Mark
- **API Secret:** Provided by D-Mark
- **Sender ID:** Your approved sender name (e.g., "DHIS2-DQ")

**Steps:**
1. Select provider
2. Fill in provider-specific fields
3. Click **"Save SMS Configuration"**
4. Test service

#### 7.3.3 WhatsApp Service Configuration

![WhatsApp Service Config](docs/images/95-whatsapp-config.png)

**Note:** WhatsApp notifications use Twilio WhatsApp Business API.

**Required Fields:**
- **Twilio Account SID:** Same as SMS Twilio config
- **Twilio Auth Token:** Same as SMS Twilio config
- **WhatsApp From Number:** Your Twilio WhatsApp-enabled number (format: `whatsapp:+1234567890`)

**Steps:**
1. Ensure you have Twilio WhatsApp Business approved number
2. Fill in credentials
3. Click **"Save WhatsApp Configuration"**
4. Test service

**Getting Twilio WhatsApp Access:**
- Visit [Twilio WhatsApp Setup](https://www.twilio.com/whatsapp)
- Request WhatsApp Business profile
- Get approved sender number

### 7.4 Testing Notification Services

After configuring services, test them before enabling for facilities.

![Test Services Section](docs/images/96-test-services.png)

**Steps:**
1. Scroll to **"Test Notification Services"** section
2. Select service to test (Email, SMS, WhatsApp)
3. Enter test recipient:
   - **Email:** Enter test email address
   - **SMS:** Enter test phone number (format: `+256712345678`)
   - **WhatsApp:** Enter test WhatsApp number (format: `+256712345678`)
4. Click **"Send Test Notification"**

![Test Notification Form](docs/images/97-test-notification-form.png)

**Success:**
- Green toast message: "Test notification sent successfully!"
- Check recipient inbox/phone for test message

![Test Success](docs/images/98-test-success.png)

**Failure:**
- Red toast message with error details
- Review configuration and try again

### 7.5 Managing Facility Contacts

Add health facilities and their contact information for automated notifications.

#### 7.5.1 Viewing Facility List

![Facility List](docs/images/99-facility-list.png)

**Table Columns:**
- **Facility Name**
- **Organization Unit:** Mapped DHIS2 org unit
- **Email Contacts:** Count of email addresses
- **SMS Contacts:** Count of phone numbers
- **WhatsApp Contacts:** Count of WhatsApp numbers
- **Notification Preferences:** Enabled channels (icons)
- **Status:** Active/Inactive
- **Actions:** Edit, Delete buttons

#### 7.5.2 Adding a New Facility

1. Click **"Add Facility"** button

![Add Facility Button](docs/images/100-add-facility-button.png)

2. Facility creation modal opens

![Add Facility Modal](docs/images/101-add-facility-modal.png)

**Step 1: Basic Information**

![Facility Basic Info](docs/images/102-facility-basic-info.png)

- **Facility Name:** Name of the health facility (e.g., "Kisenyi Health Centre III")
- **Organization Unit:** Click to select the corresponding DHIS2 org unit from tree

**Step 2: Contact Information**

![Facility Contacts](docs/images/103-facility-contacts.png)

**Email Addresses:**
- Click **"Add Email"** to add email fields
- Enter email addresses (one per field)
- Click **"Remove"** to delete an email field

**Phone Numbers (SMS):**
- Click **"Add Phone Number"** to add phone fields
- Enter phone numbers in international format (e.g., `+256712345678`)
- Click **"Remove"** to delete a phone field

**WhatsApp Numbers:**
- Click **"Add WhatsApp Number"** to add WhatsApp fields
- Enter WhatsApp numbers in international format
- Click **"Remove"** to delete a WhatsApp field

**Step 3: Notification Preferences**

![Notification Preferences](docs/images/104-notification-preferences.png)

**Toggle Channels:**
- **Email Notifications:** Enable/disable email alerts
- **SMS Notifications:** Enable/disable SMS alerts
- **WhatsApp Notifications:** Enable/disable WhatsApp alerts

**Additional Preferences:**
- **Notify on DQ Run Completion:** Send notification after every DQ run for this facility
- **Notify on Validation Errors:** Send notification only when errors are detected
- **Notify on Comparison Mismatches:** Send notification when comparison finds discrepancies
- **Notification Frequency:** Immediate, Daily Digest, Weekly Digest

**Step 4: Save**

Click **"Add Facility"** button.

![Save Facility Button](docs/images/105-save-facility-button.png)

**Success:** Green toast appears: "Facility added successfully!"

#### 7.5.3 Editing a Facility

1. Click **"Edit"** button in the facility row

![Edit Facility Button](docs/images/106-edit-facility-button.png)

2. Facility edit modal opens with pre-filled values
3. Modify fields as needed
4. Click **"Update Facility"**

![Edit Facility Modal](docs/images/107-edit-facility-modal.png)

#### 7.5.4 Deleting a Facility

1. Click **"Delete"** button in the facility row

![Delete Facility Button](docs/images/108-delete-facility-button.png)

2. Confirmation dialog appears: "Are you sure you want to delete [Facility Name]?"
3. Click **"Confirm"**

![Delete Confirmation](docs/images/109-delete-confirmation.png)

**Warning:** Deleted facilities cannot be recovered. Past notifications remain in logs.

#### 7.5.5 Searching and Filtering Facilities

**Search Bar:**
Type facility name or organization unit to filter the list.

![Search Facilities](docs/images/110-search-facilities.png)

**Filter Dropdown:**
- **All Facilities**
- **Active Only**
- **Inactive Only**
- **By Channel:** Email-enabled, SMS-enabled, WhatsApp-enabled

![Filter Facilities](docs/images/111-filter-facilities.png)

### 7.6 Notification Triggers

Notifications are triggered by:

1. **DQ Run Completion:**
   - Triggered after a DQ run finishes
   - Sent to facilities whose org units were included in the run
   - Contains: Summary, validation errors, data completeness

2. **Comparison Mismatches:**
   - Triggered when dataset comparison detects discrepancies
   - Sent to facilities with mismatched data
   - Contains: Mismatch details, affected data elements

3. **Validation Errors:**
   - Triggered when critical validation rules fail
   - Sent immediately
   - Contains: Error type, severity, affected records

### 7.7 Notification Message Templates

#### 7.7.1 DQ Run Completion Email Template

![Email Template DQ Run](docs/images/112-email-template-dq.png)

**Example:**

```
Subject: Data Quality Check Completed - Kisenyi Health Centre III

Dear Kisenyi Health Centre III,

A data quality check has been completed for your facility.

Summary:
- Dataset: ANC Monthly Report
- Period: January 2024
- Organization Unit: Kisenyi Health Centre III
- Status: Completed with Warnings

Results:
- Total Records: 45
- Valid Records: 42
- Validation Errors: 3

Validation Errors Detected:
1. Live Births: Value 150 exceeds expected range (0-100) - Severity: Error
2. ANC 1st Visit: Missing data - Severity: Warning
3. Maternal Deaths: Inconsistent with Live Births ratio - Severity: Warning

Please review and correct these issues in DHIS2.

For assistance, contact the DHIS2 support team.

---
IWS-App - Data Quality Dashboard
```

#### 7.7.2 SMS Template

![SMS Template](docs/images/113-sms-template.png)

**Example:**

```
IWS-App DQ Alert: Kisenyi HC III - ANC Jan 2024 completed. 3 errors detected. Check email for details.
```

**Character Limit:** SMS templates are limited to 160 characters.

#### 7.7.3 WhatsApp Template

![WhatsApp Template](docs/images/114-whatsapp-template.png)

**Example:**

```
📊 *IWS-App Data Quality Alert*

*Facility:* Kisenyi Health Centre III
*Dataset:* ANC Monthly Report
*Period:* January 2024

*Results:*
✅ Valid Records: 42
⚠️ Errors: 3

*Action Required:*
Please review and correct the validation errors in DHIS2.

_View details in your email._
```

### 7.8 Notification Logs

View a history of all sent notifications.

![Notification Logs](docs/images/115-notification-logs.png)

**Access:**
1. In the Notifications tab, scroll to **"Notification History"** section
2. Or click **"View Logs"** button

**Log Table Columns:**
- **Timestamp:** When notification was sent
- **Facility:** Recipient facility name
- **Channel:** Email, SMS, or WhatsApp
- **Recipient:** Email address or phone number
- **Type:** DQ Run, Comparison, Validation Error
- **Status:** Sent, Failed, Pending
- **Error Message:** If failed, reason for failure

**Filtering Logs:**
- Filter by date range
- Filter by facility
- Filter by channel
- Filter by status

![Filter Logs](docs/images/116-filter-logs.png)

**Exporting Logs:**
Click **"Export Logs"** to download as CSV.

---

## 8. Schedule Management

Automate data quality checks to run at specified times without manual intervention.

### 8.1 Accessing Schedule Management

1. Navigate to **"DQ Engine"** tab
2. Click **"Schedules"** sub-tab

![Schedules Tab](docs/images/117-schedules-tab.png)

### 8.2 Schedule List Interface

![Schedule List](docs/images/118-schedule-list.png)

**Table Columns:**
- **Schedule Name**
- **Configuration:** Linked DQ or comparison configuration
- **Frequency:** Cron expression or human-readable (e.g., "Daily at 8:00 AM")
- **Next Run:** Timestamp of next scheduled execution
- **Last Run:** Timestamp of last execution
- **Status:** Active, Inactive, Running
- **Actions:** Edit, Delete, Run Now, Toggle Active

### 8.3 Creating a New Schedule

1. Click **"Create New Schedule"** button

![Create Schedule Button](docs/images/119-create-schedule-button.png)

2. Schedule creation modal opens

![Create Schedule Modal](docs/images/120-create-schedule-modal.png)

**Step 1: Basic Information**

![Schedule Basic Info](docs/images/121-schedule-basic-info.png)

- **Schedule Name:** Descriptive name (e.g., "Daily ANC Data Check")
- **Description:** Optional notes

**Step 2: Select Configuration**

![Schedule Select Config](docs/images/122-schedule-select-config.png)

- Click **"Select Configuration"** dropdown
- Choose a saved DQ or comparison configuration
- Configuration details appear below

**Step 3: Set Frequency**

![Schedule Frequency](docs/images/123-schedule-frequency.png)

**Option A: Use Preset Frequencies**

Select from common presets:
- **Daily:** Every day at specified time
- **Weekly:** Every week on specified day(s) at specified time
- **Monthly:** Every month on specified date at specified time
- **Quarterly:** Every quarter on specified date

**Daily Example:**

![Daily Schedule](docs/images/124-daily-schedule.png)

- Select "Daily"
- Set time (e.g., 08:00 AM)
- Select timezone

**Weekly Example:**

![Weekly Schedule](docs/images/125-weekly-schedule.png)

- Select "Weekly"
- Check days of the week (Monday, Wednesday, Friday)
- Set time
- Select timezone

**Monthly Example:**

![Monthly Schedule](docs/images/126-monthly-schedule.png)

- Select "Monthly"
- Set date (1-28, or "Last day of month")
- Set time
- Select timezone

**Option B: Use Cron Expression**

For advanced users, enter a custom cron expression.

![Cron Expression](docs/images/127-cron-expression.png)

- Toggle **"Use Cron Expression"**
- Enter cron string (e.g., `0 8 * * 1-5` for weekdays at 8:00 AM)
- Cron helper displays next 5 run times for validation

**Cron Expression Format:**

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday=0)
│ │ │ │ │
* * * * *
```

**Common Cron Examples:**

| Expression | Description |
|------------|-------------|
| `0 8 * * *` | Every day at 8:00 AM |
| `0 8 * * 1-5` | Weekdays at 8:00 AM |
| `0 0 1 * *` | First day of every month at midnight |
| `0 8 1 1,4,7,10 *` | Quarterly (Jan, Apr, Jul, Oct) at 8:00 AM |
| `*/30 * * * *` | Every 30 minutes |

**Step 4: Configure Parameters**

![Schedule Parameters](docs/images/128-schedule-parameters.png)

**Dynamic Parameters:**
- **Organization Unit:** Select default org unit, or choose "Use Current Month's Org Units" for dynamic selection
- **Period:** Select default period, or choose:
  - **Previous Month:** Automatically use the month before execution
  - **Current Month:** Use the month of execution
  - **Previous Quarter:** Use the quarter before execution

**Use Case for Dynamic Periods:**
If you schedule a monthly DQ run for the 5th of each month, set period to "Previous Month" so it checks the previous month's data automatically.

**Step 5: Notification Settings**

![Schedule Notifications](docs/images/129-schedule-notifications.png)

- **Send Notifications:** Enable to trigger facility notifications after run
- **Notify on Success:** Send notification even if no errors
- **Notify on Failure:** Send notification if run fails
- **Notify on Errors Only:** Send notification only if validation errors detected

**Step 6: Save Schedule**

Click **"Create Schedule"** button.

![Save Schedule Button](docs/images/130-save-schedule-button.png)

**Success:** Green toast appears: "Schedule created successfully!"

### 8.4 Managing Schedules

#### 8.4.1 Activating/Deactivating Schedules

Toggle the **Active/Inactive** switch in the schedule row.

![Toggle Schedule Active](docs/images/131-toggle-schedule-active.png)

- **Active:** Schedule will execute automatically at specified time
- **Inactive:** Schedule is paused and won't execute

#### 8.4.2 Running a Schedule Immediately

To execute a schedule outside its normal time:

1. Click **"Run Now"** button in the schedule row

![Run Now Button](docs/images/132-run-now-button.png)

2. Confirmation dialog: "Run this schedule now?"
3. Click **"Confirm"**
4. Schedule executes immediately
5. Results appear in DQ run history

#### 8.4.3 Editing a Schedule

1. Click **"Edit"** button in the schedule row

![Edit Schedule Button](docs/images/133-edit-schedule-button.png)

2. Schedule edit modal opens with pre-filled values
3. Modify fields as needed
4. Click **"Update Schedule"**

![Edit Schedule Modal](docs/images/134-edit-schedule-modal.png)

#### 8.4.4 Deleting a Schedule

1. Click **"Delete"** button in the schedule row

![Delete Schedule Button](docs/images/135-delete-schedule-button.png)

2. Confirmation dialog: "Are you sure you want to delete this schedule?"
3. Click **"Confirm"**

**Warning:** Deleted schedules cannot be recovered. Past execution history is retained.

### 8.5 Schedule Execution History

View detailed logs of all scheduled runs.

![Schedule History](docs/images/136-schedule-history.png)

**Access:**
Click **"View History"** button on a schedule row.

**History Table Columns:**
- **Execution Time:** When the schedule ran
- **Status:** Success, Failed, Partial
- **Duration:** How long the run took
- **Records Processed:** Number of data values processed
- **Errors Detected:** Number of validation errors
- **Actions:** View Details, View Results

**Viewing Execution Details:**

1. Click **"View Details"** button

![View Execution Details](docs/images/137-execution-details.png)

2. Modal opens with:
   - Full configuration used
   - Parameters (org unit, period)
   - Detailed results summary
   - Validation errors table
   - Notifications sent

### 8.6 Schedule Monitoring Dashboard

Monitor all schedules at a glance.

![Schedule Dashboard](docs/images/138-schedule-dashboard.png)

**Access:**
Click **"Schedule Dashboard"** button at the top of the Schedules tab.

**Dashboard Widgets:**

1. **Active Schedules Count**
2. **Next Scheduled Run** (countdown timer)
3. **Recent Executions** (last 10 runs)
4. **Success Rate Chart** (last 30 days)
5. **Failed Schedules Alert** (if any failures in last 24 hours)

---

## 9. Advanced Features

### 9.1 Validation Rules Engine

Define custom validation rules to ensure data quality beyond standard checks.

#### 9.1.1 Accessing Validation Rules

![Validation Rules Access](docs/images/139-validation-rules-access.png)

**Access Path:**
1. Navigate to **"DQ Engine"** tab
2. Click **"Advanced Settings"** button (gear icon)
3. Select **"Validation Rules"** from the menu

#### 9.1.2 Viewing Existing Rules

![Validation Rules List](docs/images/140-validation-rules-list.png)

**Table Columns:**
- **Rule Name**
- **Rule Type:** Range, Consistency, Outlier, Mandatory
- **Dataset:** Which dataset(s) the rule applies to
- **Severity:** Error, Warning, Info
- **Status:** Active, Inactive
- **Actions:** Edit, Delete, Toggle

#### 9.1.3 Rule Types Explained

**1. Range Validation**

Checks if a value falls within an expected minimum and maximum.

![Range Rule Example](docs/images/141-range-rule.png)

**Example:**
- Data Element: Live Births
- Min Value: 0
- Max Value: 100
- Severity: Error
- Message: "Live Births should be between 0 and 100"

**2. Consistency Validation**

Verifies relationships between multiple data elements.

![Consistency Rule Example](docs/images/142-consistency-rule.png)

**Example:**
- Expression: `Total Deliveries = Facility Deliveries + Community Deliveries`
- Severity: Error
- Message: "Total Deliveries must equal the sum of Facility and Community Deliveries"

**3. Outlier Detection**

Identifies statistically unusual values based on historical data.

![Outlier Rule Example](docs/images/143-outlier-rule.png)

**Example:**
- Data Element: ANC 1st Visit
- Method: Standard Deviation (>3 SD from mean)
- Lookback Period: Last 12 months
- Severity: Warning
- Message: "ANC 1st Visit value is unusually high compared to historical data"

**4. Mandatory Field Check**

Ensures required data elements are not missing.

![Mandatory Rule Example](docs/images/144-mandatory-rule.png)

**Example:**
- Data Elements: Live Births, Maternal Deaths, ANC 1st Visit
- Severity: Error
- Message: "This data element is mandatory and must have a value"

#### 9.1.4 Creating a Custom Validation Rule

1. Click **"Create New Rule"** button

![Create Rule Button](docs/images/145-create-rule-button.png)

2. Rule creation wizard opens

**Step 1: Select Rule Type**

![Select Rule Type](docs/images/146-select-rule-type.png)

Choose from: Range, Consistency, Outlier, Mandatory

**Step 2: Configure Rule (Range Example)**

![Configure Range Rule](docs/images/147-configure-range-rule.png)

- **Rule Name:** Descriptive name
- **Dataset:** Select applicable dataset(s)
- **Data Element:** Select data element to validate
- **Minimum Value:** Lowest acceptable value
- **Maximum Value:** Highest acceptable value
- **Apply to Org Unit Levels:** Choose which org unit levels (e.g., only Health Centre III and IV)
- **Severity:** Error, Warning, or Info
- **Custom Message:** Error message to display

**Step 3: Configure Rule (Consistency Example)**

![Configure Consistency Rule](docs/images/148-configure-consistency-rule.png)

- **Rule Name:** Descriptive name
- **Dataset:** Select applicable dataset(s)
- **Data Elements Involved:** Select all data elements in the relationship
- **Expression:** Write the consistency formula
  - Use data element UIDs or placeholders
  - Supported operators: `+`, `-`, `*`, `/`, `=`, `>`, `<`, `>=`, `<=`, `!=`
  - Example: `#{dataElementUID1} = #{dataElementUID2} + #{dataElementUID3}`
- **Tolerance:** Allow small differences (e.g., ±5%)
- **Severity:** Error, Warning, or Info
- **Custom Message:** Error message to display

**Expression Builder:**

The expression builder helps construct complex formulas:

![Expression Builder](docs/images/149-expression-builder.png)

- Click **"Add Data Element"** to insert data element tokens
- Use operator buttons to build the formula
- Preview shows the human-readable version

**Step 4: Test Rule**

Before saving, test the rule with sample data:

![Test Rule](docs/images/150-test-rule.png)

- Click **"Test Rule"** button
- Select a sample org unit and period
- Click **"Run Test"**
- Results show whether rule passes or fails with sample data

**Step 5: Save Rule**

Click **"Save Rule"** button.

![Save Rule Button](docs/images/151-save-rule-button.png)

#### 9.1.5 Editing a Validation Rule

1. Click **"Edit"** button in the rule row
2. Modify fields as needed
3. Click **"Update Rule"**

#### 9.1.6 Activating/Deactivating Rules

Toggle the **Active/Inactive** switch to enable/disable rules without deleting them.

![Toggle Rule Active](docs/images/152-toggle-rule-active.png)

#### 9.1.7 Deleting a Rule

1. Click **"Delete"** button in the rule row
2. Confirm deletion

**Warning:** Deleted rules cannot be recovered.

#### 9.1.8 Rule Execution

Validation rules execute automatically during DQ runs:
- All active rules for the selected dataset are applied
- Errors, warnings, and info messages appear in the results
- Notifications include rule violations

### 9.2 Intelligent Data Element Mapping

#### 9.2.1 Understanding Auto-Mapping Algorithms

IWS-App uses multiple algorithms to auto-map data elements:

**1. Levenshtein Distance**

Measures edit distance between two strings.

![Levenshtein Example](docs/images/153-levenshtein-example.png)

**Example:**
- "Live Births" vs "Live births" → Distance: 1 (one case change)
- Similarity: 91%

**2. Jaro-Winkler Similarity**

Optimized for short strings, prioritizes matching prefixes.

![Jaro-Winkler Example](docs/images/154-jaro-winkler-example.png)

**Example:**
- "ANC 1st Visit" vs "ANC First Visit" → Similarity: 85%

**3. Token-Based Matching**

Compares individual words.

![Token Matching Example](docs/images/155-token-matching-example.png)

**Example:**
- "Total Live Births - Facility" vs "Facility Live Births Total"
- Common tokens: "Live", "Births", "Facility"
- Similarity: 75%

**4. Semantic Similarity**

Matches meaning using predefined health indicator patterns.

![Semantic Matching Example](docs/images/156-semantic-matching-example.png)

**Example:**
- "Deliveries" vs "Births" → Recognized as similar concepts
- Similarity: 70%

**5. N-gram Analysis**

Compares character sequences.

![N-gram Example](docs/images/157-ngram-example.png)

**Example:**
- "Malaria" vs "Malara" (typo) → High n-gram overlap
- Similarity: 80%

#### 9.2.2 Improving Auto-Mapping Accuracy

**Best Practices:**

1. **Use Consistent Naming:** Standardize data element names across datasets
2. **Include Keywords:** Use common health terminology (Births, Deaths, ANC, etc.)
3. **Review Auto-Mapped Results:** Always review and adjust auto-mapping before executing
4. **Create Custom Patterns:** Add custom semantic patterns for your specific datasets
5. **Save Mappings:** Reuse successful mappings in configurations

**Adding Custom Semantic Patterns:**

![Custom Patterns](docs/images/158-custom-patterns.png)

**Access:**
1. Go to **"Advanced Settings"** → **"Data Element Patterns"**
2. Click **"Add Pattern"**
3. Define synonyms or related terms
4. Save pattern

**Example Pattern:**
- Base Term: "Maternal Deaths"
- Synonyms: "Maternal Mortality", "Mothers Died", "Death - Maternal"

#### 9.2.3 Manual Mapping Override

If auto-mapping fails or is incorrect, manually adjust:

1. In the data element mapping section, click the dropdown next to a source element

![Manual Override](docs/images/159-manual-override.png)

2. Search for the correct destination element
3. Select the correct match
4. Repeat for all incorrect mappings

### 9.3 Audit Logging and Compliance

IWS-App maintains comprehensive audit logs for compliance and troubleshooting.

#### 9.3.1 Accessing Audit Logs

![Audit Logs Access](docs/images/160-audit-logs-access.png)

**Access Path:**
1. Navigate to **"Advanced Settings"** (gear icon)
2. Select **"Audit Logs"**

#### 9.3.2 Audit Log Interface

![Audit Logs Table](docs/images/161-audit-logs-table.png)

**Table Columns:**
- **Timestamp:** Date and time of action
- **User:** Who performed the action
- **Action Type:** Create, Update, Delete, Execute, View
- **Entity Type:** Configuration, DQ Run, Comparison, Schedule, etc.
- **Entity Name:** Name of the affected entity
- **Details:** Summary of the change
- **IP Address:** User's IP address
- **Session ID:** Unique session identifier

#### 9.3.3 Filtering Audit Logs

![Audit Log Filters](docs/images/162-audit-log-filters.png)

**Filter Options:**
- **Date Range:** From and To dates
- **User:** Filter by specific user
- **Action Type:** Filter by action (Create, Update, Delete, Execute)
- **Entity Type:** Filter by entity (Configuration, DQ Run, etc.)

#### 9.3.4 Viewing Detailed Audit Entries

Click on a log entry to view full details:

![Audit Entry Details](docs/images/163-audit-entry-details.png)

**Details Include:**
- Full timestamp with timezone
- User details (name, username, email)
- Action type and description
- Before and after values (for updates)
- Related entities
- System information (browser, OS, IP)

#### 9.3.5 Exporting Audit Logs

For compliance reporting, export audit logs:

1. Apply desired filters
2. Click **"Export Audit Logs"** button

![Export Audit Logs](docs/images/164-export-audit-logs.png)

3. Choose format (CSV, Excel, JSON)
4. File downloads with filtered results

**Use Cases:**
- Compliance audits
- Security investigations
- Troubleshooting configuration changes
- User activity monitoring

### 9.4 Advanced API Usage

For developers integrating with IWS-App programmatically.

#### 9.4.1 API Documentation

![API Documentation](docs/images/165-api-docs.png)

**Access:**
Navigate to: `http://[your-iws-app-url]/api/docs`

**Interactive API Explorer:**
- Swagger UI interface
- Test endpoints directly in browser
- View request/response schemas
- Authentication instructions

#### 9.4.2 Authentication

All API requests require authentication.

**Method 1: Basic Auth**

```bash
curl -X POST http://localhost:4000/api/run-dq \
  -u username:password \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**Method 2: API Key**

Generate an API key:
1. Go to **"Advanced Settings"** → **"API Keys"**
2. Click **"Generate New API Key"**
3. Copy the key (shown only once)

![API Key Generation](docs/images/166-api-key-generation.png)

Use in requests:

```bash
curl -X POST http://localhost:4000/api/run-dq \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

#### 9.4.3 Key API Endpoints

**Execute DQ Run:**

```bash
POST /api/run-dq
```

![API Execute DQ](docs/images/167-api-execute-dq.png)

**Get Dashboard Metrics:**

```bash
GET /api/dashboard-metrics
```

**Quick Run Configuration:**

```bash
POST /api/comparison-configs/:id/run
```

**Retrieve Results:**

```bash
GET /api/dq-runs/:id
```

#### 9.4.4 Webhooks

Configure webhooks to receive real-time notifications when events occur.

![Webhook Configuration](docs/images/168-webhook-config.png)

**Access:**
1. Go to **"Advanced Settings"** → **"Webhooks"**
2. Click **"Add Webhook"**

**Configuration:**
- **Webhook URL:** Your endpoint
- **Events:** Select events to trigger webhook (DQ Run Completed, Comparison Completed, etc.)
- **Secret Key:** For signature verification
- **Active:** Enable/disable webhook

**Payload Example:**

```json
{
  "event": "dq_run_completed",
  "timestamp": "2024-01-15T08:30:00Z",
  "data": {
    "runId": "abc123",
    "status": "success",
    "totalRecords": 45,
    "validRecords": 42,
    "errors": 3,
    "orgUnit": "Kisenyi HC III",
    "period": "202401",
    "dataset": "ANC Monthly Report"
  }
}
```

### 9.5 Bulk Data Operations

Process multiple org units or periods in a single operation.

#### 9.5.1 Accessing Bulk Operations

![Bulk Operations Access](docs/images/169-bulk-operations-access.png)

**Access:**
1. Navigate to **"DQ Engine"** → **"Advanced"**
2. Click **"Bulk Operations"**

#### 9.5.2 Bulk DQ Run Interface

![Bulk DQ Interface](docs/images/170-bulk-dq-interface.png)

**Configuration:**

**1. Select Multiple Organization Units:**

Instead of individual selection, use:
- **Import from CSV:** Upload a CSV with org unit IDs
- **Select by Level:** Choose all org units at a specific level (e.g., all Health Centre IIIs)
- **Select by Region:** Choose all org units within a region

![Bulk Org Unit Selection](docs/images/171-bulk-org-unit-selection.png)

**2. Select Multiple Periods:**

- **Range Selection:** Select a start and end period (e.g., Jan 2023 - Dec 2023)
- **Import from List:** Upload a CSV with period IDs

![Bulk Period Selection](docs/images/172-bulk-period-selection.png)

**3. Execute Bulk Operation:**

Click **"Run Bulk DQ Check"**

![Bulk Execute](docs/images/173-bulk-execute.png)

**Progress Tracking:**

Bulk operations show detailed progress:
- Overall progress bar
- Individual org unit/period status
- Estimated time remaining
- Pause/Resume/Cancel buttons

![Bulk Progress](docs/images/174-bulk-progress.png)

#### 9.5.3 Bulk Results

After completion, view aggregated results:

![Bulk Results Summary](docs/images/175-bulk-results-summary.png)

**Summary:**
- Total org units processed
- Total periods processed
- Overall success rate
- Total validation errors
- Aggregated data completeness

**Detailed Results Table:**

Expand to see results for each org unit/period combination.

![Bulk Results Table](docs/images/176-bulk-results-table.png)

**Export Bulk Results:**

Click **"Export All Results"** to download comprehensive CSV report.

---

## 10. Troubleshooting

### 10.1 Common Issues and Solutions

#### Issue 1: "Authentication Failed" Error

**Problem:**
When validating DHIS2 credentials, you receive: "Authentication failed. Please check your credentials."

![Auth Failed Error](docs/images/177-auth-failed-error.png)

**Possible Causes:**
1. Incorrect username or password
2. DHIS2 URL is incorrect or unreachable
3. DHIS2 user account is locked or disabled
4. Network connectivity issue

**Solutions:**

**Step 1:** Verify credentials
- Try logging into DHIS2 directly in a browser using the same URL and credentials
- Ensure username and password are correct (check for extra spaces)

**Step 2:** Check DHIS2 URL format
- Correct format: `https://play.dhis2.org/40.0` (no trailing slash)
- Incorrect: `https://play.dhis2.org/40.0/` or `play.dhis2.org/40.0`

**Step 3:** Test network connectivity
```bash
curl https://your-dhis2-url/api/me
```

**Step 4:** Check DHIS2 user permissions
- Ensure user has "View Data" and "Add/Update Data" permissions

**Step 5:** Contact DHIS2 Administrator
If issue persists, your account may be locked or disabled.

---

#### Issue 2: "No Data Found" After Running DQ Check

**Problem:**
DQ run completes successfully, but results show 0 records processed.

![No Data Found](docs/images/178-no-data-found.png)

**Possible Causes:**
1. No data exists for the selected org unit and period
2. Incorrect org unit or period selection
3. User lacks permission to view data for selected org unit
4. Dataset is not assigned to the selected org unit

**Solutions:**

**Step 1:** Verify data exists in DHIS2
- Log into DHIS2
- Navigate to Data Entry app
- Select same org unit, dataset, and period
- Check if data values are present

**Step 2:** Check dataset assignment
- In DHIS2 Maintenance app, go to "Data Set"
- Open your dataset
- Click "Assign to organisation units"
- Verify the selected org unit is assigned

![Dataset Assignment](docs/images/179-dataset-assignment.png)

**Step 3:** Check user permissions
- Ensure your DHIS2 user can view data for the selected org unit
- In DHIS2, go to Users app → Your user → Data capture and maintenance org units

**Step 4:** Try a different org unit or period
- Select a higher-level org unit (e.g., district instead of facility)
- Try a different period when you know data exists

---

#### Issue 3: Data Element Mapping Fails

**Problem:**
Auto-mapping doesn't find any matches, or all matches are incorrect.

![Mapping Failed](docs/images/180-mapping-failed.png)

**Possible Causes:**
1. Data element names are very different between source and destination
2. Destination dataset uses different language or terminology
3. Custom data elements with no standard naming

**Solutions:**

**Step 1:** Review data element names
- Open both datasets in DHIS2
- Compare data element names side-by-side
- Look for any similarities in wording

**Step 2:** Use manual mapping
- Instead of auto-mapping, manually select each destination element from dropdowns
- Use search functionality to find elements

![Manual Mapping](docs/images/181-manual-mapping.png)

**Step 3:** Create a reusable mapping configuration
- After manually mapping once, save the configuration
- Reuse this configuration for future runs

**Step 4:** Request dataset standardization
- Contact your DHIS2 administrator
- Request alignment of data element names across datasets
- Use standard health terminology

---

#### Issue 4: Validation Errors Seem Incorrect

**Problem:**
Validation errors are reported, but the data appears correct.

![Incorrect Validation](docs/images/182-incorrect-validation.png)

**Possible Causes:**
1. Validation rule is misconfigured
2. Range thresholds are too restrictive
3. Consistency rule doesn't account for all scenarios
4. Historical data used for outlier detection is inaccurate

**Solutions:**

**Step 1:** Review the validation rule
- Navigate to **"Validation Rules"**
- Find the rule causing the error
- Check the rule configuration (min/max values, expression, etc.)

**Step 2:** Adjust rule thresholds
- If a range rule is too restrictive, edit it
- Increase max value or decrease min value as appropriate

**Step 3:** Disable or delete problematic rules
- If a rule is not applicable, deactivate it
- Or delete it if it's no longer needed

**Step 4:** Create exception rules
- For special cases, create exception rules
- Use org unit level filters to apply rules selectively

---

#### Issue 5: Notifications Not Sending

**Problem:**
Facility notifications are configured, but emails/SMS/WhatsApp messages are not being received.

![Notifications Not Sending](docs/images/183-notifications-not-sending.png)

**Possible Causes:**
1. Notification service (email, SMS, WhatsApp) is misconfigured
2. Credentials are incorrect
3. Recipient contact information is wrong
4. Service provider has issues (e.g., Twilio account suspended)
5. Notifications are disabled for the facility

**Solutions:**

**Step 1:** Test notification services
- Navigate to **"Notifications"** tab
- Use **"Test Notification Services"** section
- Send test messages to your own email/phone

![Test Notifications](docs/images/184-test-notifications.png)

**Step 2:** Review service configuration
- Check email SMTP settings (host, port, username, password)
- Check SMS provider credentials (Twilio SID, Auth Token)
- Verify WhatsApp number is correct

**Step 3:** Check facility contact information
- Navigate to **"Facility Contacts"**
- Verify email addresses and phone numbers are correct
- Ensure phone numbers are in international format (+256...)

**Step 4:** Check notification preferences
- Open facility details
- Verify notification channels are enabled (Email, SMS, WhatsApp toggles)

![Notification Preferences](docs/images/185-notification-preferences.png)

**Step 5:** Check notification logs
- Navigate to **"Notification History"**
- Look for failed notifications
- Review error messages for clues

![Notification Logs Error](docs/images/186-notification-logs-error.png)

**Step 6:** Service provider issues
- **Email:** Check if your email account is blocked or requires app-specific password
- **Twilio:** Log into Twilio console and check account status
- **D-Mark:** Contact D-Mark support to verify API access

---

#### Issue 6: Scheduled DQ Runs Not Executing

**Problem:**
You created a schedule, but it's not running at the specified time.

![Schedule Not Running](docs/images/187-schedule-not-running.png)

**Possible Causes:**
1. Schedule is inactive
2. Cron expression is incorrect
3. Backend server is down or not running cron jobs
4. Timezone mismatch
5. Configuration linked to schedule was deleted

**Solutions:**

**Step 1:** Check schedule status
- Navigate to **"Schedules"** tab
- Verify schedule has "Active" status (green)
- If inactive, toggle to active

![Check Schedule Status](docs/images/188-check-schedule-status.png)

**Step 2:** Verify cron expression
- Click **"Edit"** on the schedule
- Check the cron expression
- Use a cron validator tool online to verify: [crontab.guru](https://crontab.guru/)

**Step 3:** Check "Next Run" time
- In the schedule list, check "Next Run" column
- Ensure it shows the expected future time
- If it shows past time, schedule may be stuck

**Step 4:** Test schedule manually
- Click **"Run Now"** button on the schedule
- If manual run works, issue is with cron execution
- If manual run fails, issue is with the configuration

**Step 5:** Check backend server
- Verify backend server is running: `http://[backend-url]/api/health`
- Check backend logs for cron execution errors

**Step 6:** Check timezone settings
- Ensure timezone in schedule matches your server timezone
- Convert to UTC if needed

**Step 7:** Verify linked configuration
- Ensure the configuration linked to the schedule still exists
- If configuration was deleted, schedule won't execute

---

#### Issue 7: Comparison Results Show All Mismatches

**Problem:**
When comparing datasets, nearly all records show as mismatched, even though values appear identical.

![All Mismatches](docs/images/189-all-mismatches.png)

**Possible Causes:**
1. Data element groups are incorrectly mapped
2. Different org units are mapped to the same comparison
3. Different periods are being compared
4. Data type mismatch (string vs. number)

**Solutions:**

**Step 1:** Review data element groups
- In the comparison modal, expand each data element group
- Verify that the correct elements from each dataset are grouped together
- Correct any incorrect groupings

![Review Groups](docs/images/190-review-groups.png)

**Step 2:** Check org unit consistency
- Ensure the same org unit is selected for all datasets
- If org unit UIDs differ between instances, manually verify they represent the same facility

**Step 3:** Check period consistency
- Ensure the same period is selected (e.g., "202401" for all datasets)
- DHIS2 period formats must match exactly

**Step 4:** Check data types
- In DHIS2 Maintenance app, check data element value types
- Ensure corresponding data elements have the same value type (Number, Text, etc.)

**Step 5:** Re-run comparison with fewer datasets
- Try comparing just 2 datasets first
- Once working, add the 3rd dataset

---

#### Issue 8: Performance Issues (Slow Loading)

**Problem:**
The application is slow to load data, or operations take a very long time.

![Slow Performance](docs/images/191-slow-performance.png)

**Possible Causes:**
1. Large number of organization units selected
2. Large dataset with many data elements
3. Network latency to DHIS2 server
4. DHIS2 server is slow or overloaded
5. Browser has too many tabs open or extensions interfering

**Solutions:**

**Step 1:** Reduce scope
- Select fewer organization units (e.g., 1-5 instead of 50)
- Select fewer data elements
- Process one period at a time instead of multiple

**Step 2:** Use Quick Run with saved configurations
- Saved configurations load faster than manual runs
- System caches metadata for saved configs

**Step 3:** Check network connectivity
- Test DHIS2 server speed: Log in directly and navigate around
- If DHIS2 is slow, contact DHIS2 administrator

**Step 4:** Clear browser cache
- Clear browser cache and cookies
- Restart browser

**Step 5:** Use bulk operations wisely
- For very large operations, use Bulk Operations feature
- Bulk operations are optimized for performance

**Step 6:** Contact system administrator
- If issue persists, backend server may need optimization
- Check backend logs for performance bottlenecks

---

### 10.2 Error Messages Reference

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| "Authentication failed" | DHIS2 credentials incorrect | Verify username, password, and URL |
| "No datasets found" | User lacks permission or no datasets exist | Check DHIS2 user permissions |
| "No data found for specified parameters" | Data doesn't exist for selected org unit/period | Verify data exists in DHIS2 Data Entry |
| "Validation rule expression is invalid" | Syntax error in validation rule | Review and fix rule expression |
| "Notification service not configured" | Email/SMS/WhatsApp settings missing | Configure notification services |
| "Failed to post data to destination" | Posting to destination DHIS2 failed | Check destination credentials and permissions |
| "Schedule execution failed" | Scheduled run encountered an error | Review schedule configuration and logs |
| "Configuration not found" | Saved configuration was deleted | Create a new configuration |
| "Invalid period format" | Period doesn't match DHIS2 format | Use YYYYMM, YYYYQ#, or YYYY format |
| "Org unit not found" | Selected org unit doesn't exist | Re-select org unit from tree |

---

### 10.3 Getting Help

If you encounter issues not covered in this guide:

**Step 1: Check Application Logs**

![Application Logs](docs/images/192-app-logs.png)

- Navigate to **"Advanced Settings"** → **"System Logs"**
- Review recent error logs
- Copy error details for support

**Step 2: Contact Support**

![Contact Support](docs/images/193-contact-support.png)

- Click **"Help"** button in top-right corner
- Select **"Contact Support"**
- Fill in support form with:
  - Description of issue
  - Steps to reproduce
  - Screenshots
  - Error messages
  - Your contact information

**Step 3: Check Documentation**

- Visit online documentation: `[your-documentation-url]`
- Watch video tutorials (if available)

**Step 4: Community Forum**

- Post questions on the DHIS2 Community forum: https://community.dhis2.org/

---

## 11. Best Practices

### 11.1 Data Quality Workflows

**Best Practice 1: Start Small**

When setting up DQ processes for the first time:
1. Start with one dataset and one organization unit
2. Test validation rules with known good data
3. Gradually expand to more org units and datasets
4. Monitor results and refine validation rules

**Best Practice 2: Schedule Regular DQ Runs**

Don't wait for problems—be proactive:
1. Schedule monthly DQ runs for routine data
2. Run DQ checks shortly after reporting deadlines
3. Use notifications to alert facilities immediately
4. Review trends monthly to identify recurring issues

**Best Practice 3: Use Saved Configurations**

Avoid repetitive manual configuration:
1. Create saved configurations for routine workflows
2. Use descriptive names (e.g., "Monthly ANC DQ - All Districts")
3. Test configurations before scheduling
4. Document configuration purposes in descriptions

**Best Practice 4: Validate Before Posting**

When transferring data between DHIS2 instances:
1. Always run DQ validation on source data first
2. Review validation errors and correct in source
3. Only post validated data to destination
4. Run comparison after posting to verify accuracy

### 11.2 Configuration Management

**Best Practice 5: Organize Configurations**

Keep configurations organized:
1. Use clear, consistent naming conventions
2. Include dataset name and frequency in config name
3. Use descriptions to document purpose and scope
4. Deactivate unused configurations instead of deleting
5. Periodically review and archive old configurations

**Best Practice 6: Document Custom Validation Rules**

For custom validation rules:
1. Write clear, descriptive rule names
2. Document the rationale for each rule in the description
3. Specify who created the rule and when
4. Test rules thoroughly before activating
5. Review rules annually to ensure they're still relevant

**Best Practice 7: Version Control for Configurations**

Maintain configuration history:
1. Clone configurations before major edits
2. Include version or date in configuration name (e.g., "ANC DQ - v2")
3. Document changes in configuration description
4. Test updated configurations before replacing active versions

### 11.3 Notification Management

**Best Practice 8: Segment Notification Preferences**

Tailor notifications to recipient needs:
1. Send detailed emails to data managers
2. Send brief SMS alerts to facility heads
3. Use WhatsApp for urgent, actionable alerts
4. Allow facilities to customize their preferences
5. Respect opt-out requests

**Best Practice 9: Use Notification Frequency Wisely**

Avoid notification fatigue:
1. Use daily or weekly digests instead of immediate for non-critical issues
2. Send immediate notifications only for critical errors
3. Group multiple errors into one message when possible
4. Don't send notifications for successful runs with no errors (unless requested)

**Best Practice 10: Test Notifications Regularly**

Ensure notifications are working:
1. Test email, SMS, and WhatsApp services monthly
2. Verify facility contact information quarterly
3. Ask facilities to confirm they're receiving notifications
4. Update contact information promptly when staff change

### 11.4 Performance Optimization

**Best Practice 11: Limit Scope of Manual Runs**

For better performance:
1. Select only necessary data elements (don't use "Select All" unnecessarily)
2. Process one or a few org units at a time
3. Use bulk operations for large-scale processing
4. Avoid running multiple large DQ checks simultaneously

**Best Practice 12: Schedule Heavy Operations During Off-Peak Hours**

Reduce server load:
1. Schedule bulk operations for nights or weekends
2. Avoid scheduling during peak DHIS2 usage hours (e.g., reporting deadlines)
3. Stagger multiple schedules to avoid simultaneous execution

**Best Practice 13: Clean Up Old Data**

Maintain system performance:
1. Archive or delete old DQ run results (older than 6 months)
2. Remove obsolete configurations
3. Clean up old notification logs
4. Periodically review and delete unused validation rules

### 11.5 Security and Compliance

**Best Practice 14: Use Strong DHIS2 Credentials**

Protect sensitive data:
1. Use unique, strong passwords for DHIS2 accounts
2. Don't share DHIS2 credentials between users
3. Rotate passwords regularly
4. Use DHIS2 users with minimal necessary permissions

**Best Practice 15: Review Audit Logs Regularly**

Monitor system usage:
1. Review audit logs monthly for unusual activity
2. Check for unauthorized configuration changes
3. Monitor failed authentication attempts
4. Export audit logs quarterly for compliance

**Best Practice 16: Limit User Access**

Apply principle of least privilege:
1. Only grant IWS-App access to users who need it
2. Use DHIS2 user roles to restrict data access
3. Disable inactive user accounts promptly
4. Review user access quarterly

### 11.6 Data Quality Improvement

**Best Practice 17: Act on Validation Errors**

Don't just report errors—fix them:
1. Assign responsibility for correcting errors to specific staff
2. Set deadlines for error correction
3. Track error correction rates
4. Re-run DQ checks after corrections to verify

**Best Practice 18: Analyze Trends**

Use dashboard analytics:
1. Review success rate trends monthly
2. Identify facilities with recurring issues
3. Provide targeted training to facilities with low data quality
4. Celebrate improvements with facility staff

**Best Practice 19: Continuously Improve Validation Rules**

Refine rules over time:
1. Review false positive errors and adjust rules
2. Add new rules when new data quality issues are discovered
3. Remove rules that are no longer relevant
4. Solicit feedback from data managers on rule effectiveness

**Best Practice 20: Foster a Data Quality Culture**

Make data quality everyone's responsibility:
1. Share data quality metrics with facility staff
2. Provide positive feedback when data quality improves
3. Offer training on common data quality issues
4. Empower facilities to run their own DQ checks

---

## 12. Frequently Asked Questions (FAQ)

### General Questions

**Q1: What is the difference between a DQ Run and a Dataset Comparison?**

**A:**
- **DQ Run:** Validates data from a single dataset against validation rules, and optionally posts data to another DHIS2 instance. Focus is on data quality and transfer.
- **Dataset Comparison:** Compares the same logical data elements across multiple datasets to identify discrepancies. Focus is on consistency between datasets.

---

**Q2: Can I use IWS-App without posting data to a destination DHIS2?**

**A:** Yes! Destination configuration is optional. You can run DQ checks solely for validation purposes without transferring data.

---

**Q3: Does IWS-App modify data in my DHIS2 instance?**

**A:** IWS-App only modifies data when you configure a destination DHIS2 and explicitly post data. It never modifies source DHIS2 data. All changes are logged in audit trails.

---

**Q4: Can I compare datasets from different DHIS2 instances?**

**A:** Yes! You can compare datasets from the same DHIS2 instance or from different instances. Simply configure each dataset with its respective DHIS2 credentials.

---

**Q5: What DHIS2 versions are supported?**

**A:** IWS-App is compatible with DHIS2 versions 2.35 and above. For best performance, use DHIS2 2.38+.

---

### Configuration Questions

**Q6: How do I know if my auto-mapping is correct?**

**A:** Review the confidence scores and color coding:
- **Green (High confidence):** Very likely correct
- **Yellow (Medium confidence):** Review recommended
- **Red (Low confidence):** Definitely review and adjust manually

Always review auto-mapped results before executing.

---

**Q7: Can I use the same configuration for multiple org units?**

**A:** Yes! Saved configurations can be reused with different org units and periods. Use Quick Run or Schedules to execute with varying parameters.

---

**Q8: What happens if I delete a configuration that's used in a schedule?**

**A:** The schedule will fail to execute and show an error. You should delete or update the schedule to use a different configuration.

---

### Notification Questions

**Q9: Why are my Gmail emails not sending?**

**A:** Gmail requires an "App Password" if you have 2-Factor Authentication enabled. Generate one at: [Google App Passwords](https://myaccount.google.com/apppasswords). Don't use your regular Gmail password.

---

**Q10: Can I send notifications in my local language?**

**A:** Currently, notification templates are in English by default. Contact your administrator to customize templates for your language.

---

**Q11: How much do SMS and WhatsApp notifications cost?**

**A:** Costs depend on your SMS provider (Twilio, D-Mark) and WhatsApp provider (Twilio). Check with your provider for pricing. Email notifications are typically free.

---

**Q12: Can facilities unsubscribe from notifications?**

**A:** Yes. Update the facility's notification preferences to disable specific channels or all notifications.

---

### Validation Questions

**Q13: How do I create a validation rule that checks if Total = Male + Female?**

**A:**
1. Create a **Consistency Validation** rule
2. Select all three data elements (Total, Male, Female)
3. Use expression: `#{TotalUID} = #{MaleUID} + #{FemaleUID}`
4. Set severity to Error
5. Save and activate

---

**Q14: Can I apply different validation rules to different organization units?**

**A:** Yes. When creating a validation rule, use the "Apply to Org Unit Levels" setting to specify which levels the rule applies to (e.g., only Health Centre III and IV).

---

**Q15: What's the difference between Error, Warning, and Info severity?**

**A:**
- **Error:** Critical issue that must be corrected (e.g., value out of valid range)
- **Warning:** Potential issue that should be reviewed (e.g., unusual value)
- **Info:** Informational message, no action required (e.g., data completeness note)

---

### Schedule Questions

**Q16: What's the easiest way to schedule a monthly DQ run?**

**A:**
1. Create a saved configuration first
2. Go to Schedules → Create New Schedule
3. Select your configuration
4. Choose "Monthly" frequency
5. Set the day (e.g., 5th of each month)
6. Set period to "Previous Month" so it checks last month's data
7. Save and activate

---

**Q17: Can I schedule a DQ run to execute every 6 hours?**

**A:** Yes. Use a cron expression: `0 */6 * * *` (every 6 hours at minute 0)

---

**Q18: How do I temporarily pause a schedule without deleting it?**

**A:** Toggle the schedule to "Inactive" status. You can reactivate it later.

---

### Troubleshooting Questions

**Q19: Why does my comparison show "Missing" for data that exists?**

**A:** This usually means the data element grouping is incorrect. The system is looking for data in a data element that doesn't contain the value. Review and correct the data element groups.

---

**Q20: I get "No data found" but data exists in DHIS2. Why?**

**A:** Common causes:
1. Dataset is not assigned to the selected org unit
2. Your DHIS2 user lacks permission to view data for that org unit
3. Period format is incorrect (use YYYYMM, YYYYQ#, or YYYY)
4. Data is in a different dataset than you selected

---

### Data and Permissions Questions

**Q21: What DHIS2 permissions does my user need?**

**A:** Your DHIS2 user needs:
- **View data:** To retrieve data from DHIS2
- **Add/Update data:** To post data to destination DHIS2 (if using destination posting)
- **View metadata:** To browse datasets, data elements, org units

Contact your DHIS2 administrator to grant these permissions.

---

**Q22: Can I restrict which users can create or edit configurations?**

**A:** Yes. Contact your IWS-App administrator to configure user roles and permissions within IWS-App.

---

**Q23: Is my data encrypted?**

**A:** Yes. DHIS2 credentials are encrypted using AES-256-GCM encryption before being stored in the database. All API communication uses HTTPS.

---

### Advanced Questions

**Q24: Can I integrate IWS-App with other systems using APIs?**

**A:** Yes! IWS-App provides a full REST API. See Section 9.4 (Advanced API Usage) for details, or visit `/api/docs` on your IWS-App instance for interactive API documentation.

---

**Q25: Can I export comparison results to Excel?**

**A:** Yes. After running a comparison, click "Export Results" and choose CSV format. CSV files open in Excel.

---

**Q26: How long are DQ run results stored?**

**A:** By default, results are stored indefinitely. Your administrator can configure automatic cleanup of old results (e.g., delete results older than 6 months).

---

**Q27: Can I customize the dashboard charts?**

**A:** Currently, dashboard charts are predefined. Contact your administrator if you need custom charts or metrics.

---

**Q28: How do I migrate my configurations to a new IWS-App instance?**

**A:**
1. Export configurations from the old instance: Go to Saved Configurations → Select all → Export
2. Import into new instance: Go to Saved Configurations → Import → Upload exported JSON file

---

### Support Questions

**Q29: Where can I report bugs or request features?**

**A:** Contact your system administrator, or if you have direct access, use the "Help" → "Report Issue" feature in the application.

---

**Q30: Is there video training available?**

**A:** Contact your administrator for training resources. Training videos may be available on your organization's learning portal.

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **ANC** | Antenatal Care - healthcare provided to pregnant women |
| **API** | Application Programming Interface - allows software systems to communicate |
| **Audit Log** | Record of all actions taken in the system for compliance and security |
| **Bulk Operation** | Processing multiple organization units or periods in a single operation |
| **Configuration** | Saved set of parameters for DQ runs or comparisons that can be reused |
| **Consistency Validation** | Validation rule that checks relationships between multiple data elements |
| **Cron Expression** | String format for specifying scheduled task timing (e.g., `0 8 * * *`) |
| **Data Element** | Specific data point in DHIS2 (e.g., "Live Births", "ANC 1st Visit") |
| **Data Element Mapping** | Linking corresponding data elements across different datasets |
| **Dataset** | Collection of data elements in DHIS2, usually for a specific report or form |
| **DHIS2** | District Health Information Software 2 - health management information system |
| **DQ** | Data Quality |
| **DQ Run** | Execution of a data quality validation check |
| **Levenshtein Distance** | Algorithm measuring similarity between two strings based on edit distance |
| **Metadata** | Data about data - includes datasets, data elements, org units in DHIS2 |
| **Org Unit** | Organization Unit - facility, district, or region in DHIS2 hierarchy |
| **Outlier Detection** | Validation method that identifies statistically unusual values |
| **Period** | Time period for data (monthly, quarterly, yearly) in DHIS2 format |
| **Quick Run** | Executing a saved configuration with minimal input parameters |
| **Range Validation** | Validation rule that checks if values fall within min-max range |
| **Semantic Similarity** | Matching based on meaning, not just text similarity |
| **Validation Rule** | Rule that defines what constitutes valid or invalid data |
| **Webhook** | Automated HTTP callback to external systems when events occur |

---

## Appendix B: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save current configuration |
| `Ctrl/Cmd + R` | Run current DQ check or comparison |
| `Ctrl/Cmd + F` | Focus search bar |
| `Esc` | Close modal or dialog |
| `Ctrl/Cmd + K` | Open command palette (quick access to features) |
| `Ctrl/Cmd + ?` | Show keyboard shortcuts help |

---

## Appendix C: DHIS2 Period Format Reference

| Period Type | Format | Example | Description |
|-------------|--------|---------|-------------|
| Monthly | `YYYYMM` | `202401` | January 2024 |
| Quarterly | `YYYYQ#` | `2024Q1` | Q1 (Jan-Mar) 2024 |
| Yearly | `YYYY` | `2024` | Year 2024 |
| Financial October | `YYYY-Oct` | `2024Oct` | Oct 2023 - Sep 2024 |
| Financial July | `YYYY-Jul` | `2024Jul` | Jul 2023 - Jun 2024 |
| Weekly | `YYYY-W##` | `2024W05` | Week 5 of 2024 |

---

## Appendix D: Common Health Indicators Recognized by Auto-Mapping

The auto-mapping algorithm recognizes these common health indicators:

- Live Births / Deliveries
- Maternal Deaths / Maternal Mortality
- ANC 1st Visit / ANC First Visit
- ANC 4th Visit / ANC Fourth Visit
- Postnatal Care (PNC) Visits
- Family Planning - New Acceptors
- Family Planning - Continuing Users
- HIV Tests Conducted
- HIV Positive Results
- Malaria Cases (Confirmed, Suspected)
- TB Cases (New, Retreatment)
- Immunization - BCG, OPV, DPT, Measles
- Outpatient Attendance
- Inpatient Admissions
- Referrals (In, Out)

When your data elements use these standard terms, auto-mapping accuracy significantly improves.

---

## Appendix E: Contact Information

**Technical Support:**
- Email: [support@your-organization.org]
- Phone: [+XXX-XXX-XXXX]
- Help Desk Portal: [https://helpdesk.your-organization.org]

**DHIS2 Administrator:**
- Name: [Administrator Name]
- Email: [admin@your-organization.org]

**Training Resources:**
- User Training Portal: [https://training.your-organization.org]
- Video Tutorials: [https://videos.your-organization.org/iws-app]

**System Administrator:**
- For backend/server issues
- Email: [sysadmin@your-organization.org]

---

## Document Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2024-11-20 | Initial comprehensive user guide creation | IWS-App Team |

---

**End of User Guide**

For the latest version of this guide, visit: [https://docs.your-organization.org/iws-app]

For video tutorials and additional resources, visit: [https://training.your-organization.org/iws-app]

If you have feedback or suggestions for improving this guide, please contact: [documentation@your-organization.org]
