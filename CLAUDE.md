# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Recent Improvements (2025-10-14)

✅ **Phase 1 Improvements Complete:**
- Replaced in-memory storage with SQLite database
- Implemented AES-256-GCM encryption for credentials
- Added health check endpoint (`/api/health`)
- Added graceful shutdown handling
- See [IMPROVEMENTS_SUMMARY.md](IMPROVEMENTS_SUMMARY.md) for details
- See [dq-engine/UPGRADE_NOTES.md](dq-engine/UPGRADE_NOTES.md) for technical details

✅ **Phase 2 Improvements Complete & Integrated:**
- DHIS2-style Period Selector with visual month/quarter/year selection **[LIVE IN UI]**
- Intelligent data element auto-mapping using multiple similarity algorithms **[LIVE IN UI]**
- Advanced validation rules engine (range, consistency, outlier, mandatory)
- Comprehensive audit logging system with compliance export
- See [PHASE2_FINAL_SUMMARY.md](PHASE2_FINAL_SUMMARY.md) for complete details

**Integrated Components:**
- `src/components/PeriodSelector.tsx` - Visual period picker (now in Source System form)
- `src/components/AutoMappingButton.tsx` - One-click intelligent mapping (now in Destination form)
- `src/utils/dataElementMapping.ts` - Smart similarity algorithms (powers Auto-Map button)
- `dq-engine/src/validation/rulesEngine.ts` - Advanced validation rules
- `dq-engine/src/utils/auditLog.ts` - Audit logging system

**Where to Find in UI:**
- Source System Details → Period field now uses visual selector
- Destination System Details → "Auto-Map" button next to Data Element Mapping label

## Development Commands

### Frontend (React App)
- **Build**: `yarn build` - Build the React app using d2-app-scripts
- **Development**: `yarn dev` - Start both frontend and DQ engine concurrently
- **Start**: `yarn start` - Start only the frontend dev server (port 3000)
- **Test**: `yarn test` - Run tests using d2-app-scripts
- **Deploy**: `yarn deploy` - Deploy the app using d2-app-scripts

### DQ Engine (Backend API)
Navigate to `dq-engine/` directory:
- **Development**: `yarn dev` - Start with nodemon and hot reloading
- **Build**: `yarn build` - Compile TypeScript to dist/
- **Start**: `yarn start` - Run compiled JavaScript (port 4000)

## Architecture Overview

This is a DHIS2-based dashboard application with a modular architecture:

### Frontend Structure
- **Entry Point**: `src/AppWrapper.jsx` - Main app wrapper with providers
- **Main App**: `src/components/App.tsx` - Tab-based navigation between three main views
- **UI Libraries**: Dual UI framework approach using both Chakra UI and Ant Design
- **State Management**: React Query (@tanstack/react-query) for server state

### Three Main Application Views
1. **Dashboard View** (`DashboardView.tsx`) - Main analytics dashboard
2. **DQ Engine View** (`DQEngineView.tsx`) - Data quality engine interface  
3. **Metadata Assessment View** (`MetadataAssessmentView.tsx`) - Metadata analysis tools

### Backend API (DQ Engine)
- **Location**: `dq-engine/` subdirectory
- **Tech Stack**: Express.js + TypeScript
- **Purpose**: Data quality processing and scheduled job management
- **Key Features**:
  - Manual DQ runs via `/api/run-dq`
  - Schedule management (CRUD operations)
  - DHIS2 integration for data retrieval/posting
  - Cron job scheduling system

### Development Proxy Setup
- Frontend (port 3000) proxies `/api` requests to backend (port 4000)
- Configured in both `vite.config.ts` and `setupProxy.js`
- Use `yarn dev` to run both services concurrently

### Key Dependencies
- **DHIS2**: `@dhis2/app-runtime`, `@dhis2/ui`, `@dhis2/cli-app-scripts`
- **UI Frameworks**: `@chakra-ui/react`, `antd`
- **Data Visualization**: `apexcharts`, `react-apexcharts`, `echarts-for-react`
- **Data Fetching**: `@tanstack/react-query`, `@tanstack/react-table`

### Configuration Files
- **d2.config.js**: DHIS2 app configuration with AppWrapper entry point
- **vite.config.ts**: Vite dev server and build configuration
- **tsconfig.json**: TypeScript configuration (separate configs for frontend and DQ engine)

## Important Notes

- The app uses a dual UI framework approach (Chakra UI + Ant Design) - maintain consistency with existing patterns
- DQ Engine is a separate TypeScript service - always navigate to `dq-engine/` for backend changes
- Data elements and DHIS2 integration are core to the application functionality
- Schedule management and cron jobs are handled entirely by the DQ engine backend