# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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