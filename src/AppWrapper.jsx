import React from 'react'
import { ChakraProvider } from '@chakra-ui/react'
import { ConfigProvider as AntdConfigProvider } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'antd/dist/reset.css'
import App from './components/App'
import ReactErrorBoundary from './components/ReactErrorBoundary'
import theme from './theme'

const queryClient = new QueryClient()

export default function AppWrapper() {
    return (
        <ChakraProvider theme={theme}>
            <AntdConfigProvider>
                <QueryClientProvider client={queryClient}>
                    <ReactErrorBoundary>
                        <App />
                    </ReactErrorBoundary>
                </QueryClientProvider>
            </AntdConfigProvider>
        </ChakraProvider>
    )
}
