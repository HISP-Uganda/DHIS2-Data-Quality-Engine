import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

const DQ_ENGINE_URL = process.env.VITE_DQ_ENGINE_URL || 'http://localhost:4000'

export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    server: {
        port: 3000,
        proxy: {
            // DQ Engine specific endpoints
            '/api/run-dq': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/schedules': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/compare-datasets': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/get-datasets': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/get-dataset-elements': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/get-org-units': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/get-data-elements': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            // Dashboard and statistics endpoints
            '/api/dashboard-metrics': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/comparison-stats': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/dq-runs': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/comparisons': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/reset-stats': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            // Notification management endpoints
            '/api/facilities': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/notifications': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/comparison-configs': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            '/api/validate-auth': {
                target: DQ_ENGINE_URL,
                changeOrigin: true,
            },
            // Default DHIS2 proxy for other /api/* calls
            '/api': {
                target: 'https://hmis-tests.health.go.ug',
                changeOrigin: true,
                secure: true,
            },
        },
    },
    optimizeDeps: {
        include: [
            'antd',
            '@tanstack/react-query',
            'react-error-boundary',
            '@chakra-ui/react',
            '@chakra-ui/table',
            '@chakra-ui/checkbox',
            '@chakra-ui/icons',
            '@chakra-ui/menu',
            'react-apexcharts',
            'apexcharts',
            'react-calendar',
            'react-icons/md',
        ],
    },
})
