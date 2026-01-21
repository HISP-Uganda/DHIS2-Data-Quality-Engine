// API Configuration
export const API_CONFIG = {
    DQ_ENGINE_URL: process.env.NODE_ENV === 'development'
        ? 'http://localhost:4000'
        : 'https://engine.dqas.hispuganda.org'
}
