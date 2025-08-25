import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    server: {
        port: 3000,
        proxy: {
            // DQ Engine specific endpoints
            '/api/run-dq': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api/schedules': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api/compare-datasets': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api/get-datasets': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api/get-dataset-elements': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api/get-org-units': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api/get-data-elements': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            // Dashboard and statistics endpoints
            '/api/dashboard-metrics': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api/comparison-stats': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api/dq-runs': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api/comparisons': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api/reset-stats': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            // Notification management endpoints
            '/api/facilities': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/api/notifications': {
                target: 'http://localhost:4000',
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
