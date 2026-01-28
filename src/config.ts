// API Configuration
export const API_CONFIG = {
    DQ_ENGINE_URL: import.meta.env.VITE_DQ_ENGINE_URL || 'https://engine.dqas.hispuganda.org'
}

// Export as constant for easy access
export const DQ_ENGINE_URL = API_CONFIG.DQ_ENGINE_URL
