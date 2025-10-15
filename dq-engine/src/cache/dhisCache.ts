/**
 * DHIS2 API Cache Wrapper
 *
 * Provides intelligent caching for DHIS2 API responses with:
 * - Smart cache keys based on URL + credentials
 * - Appropriate TTLs for different resource types
 * - Cache invalidation helpers
 */

import { cacheService } from './cacheService'
import crypto from 'crypto'

/**
 * Cache TTLs (in seconds) for different DHIS2 resources
 */
const CACHE_TTL = {
    // Metadata rarely changes
    datasets: 3600,           // 1 hour
    dataElements: 3600,       // 1 hour
    orgUnits: 1800,          // 30 minutes
    orgUnitTree: 1800,       // 30 minutes

    // User data changes occasionally
    userInfo: 300,           // 5 minutes

    // Data values change frequently
    dataValues: 60,          // 1 minute

    // Analytics can be cached longer
    analytics: 600,          // 10 minutes
}

/**
 * Generate a cache key from URL and credentials
 * Uses hash to avoid storing sensitive credentials in cache keys
 */
function generateCacheKey(
    url: string,
    username: string,
    password: string,
    endpoint: string
): string {
    // Hash credentials for security
    const credHash = crypto
        .createHash('sha256')
        .update(`${username}:${password}`)
        .digest('hex')
        .substring(0, 16)

    // Clean URL (remove trailing slashes)
    const baseUrl = url.replace(/\/$/, '')

    // Create cache key
    return `dhis2:${credHash}:${baseUrl}:${endpoint}`
}

/**
 * Fetch DHIS2 datasets with caching
 */
export async function fetchDatasetsCached(
    url: string,
    username: string,
    password: string
): Promise<any> {
    const endpoint = 'api/dataSets.json?fields=id,displayName,dataSetElements[dataElement[id,displayName]]&paging=false'
    const cacheKey = generateCacheKey(url, username, password, endpoint)

    return cacheService.wrap(
        cacheKey,
        async () => {
            const baseUrl = url.replace(/\/$/, '')
            const auth = Buffer.from(`${username}:${password}`).toString('base64')

            const response = await fetch(`${baseUrl}/${endpoint}`, {
                headers: { Authorization: `Basic ${auth}` },
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch datasets: ${response.status}`)
            }

            return await response.json()
        },
        { ttl: CACHE_TTL.datasets }
    )
}

/**
 * Fetch DHIS2 data elements with caching
 */
export async function fetchDataElementsCached(
    url: string,
    username: string,
    password: string,
    datasetId: string
): Promise<any> {
    const endpoint = `api/dataSets/${datasetId}.json?fields=dataSetElements[dataElement[id,displayName]]`
    const cacheKey = generateCacheKey(url, username, password, endpoint)

    return cacheService.wrap(
        cacheKey,
        async () => {
            const baseUrl = url.replace(/\/$/, '')
            const auth = Buffer.from(`${username}:${password}`).toString('base64')

            const response = await fetch(`${baseUrl}/${endpoint}`, {
                headers: { Authorization: `Basic ${auth}` },
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch data elements: ${response.status}`)
            }

            return await response.json()
        },
        { ttl: CACHE_TTL.dataElements }
    )
}

/**
 * Fetch DHIS2 organization units with caching
 */
export async function fetchOrgUnitsCached(
    url: string,
    username: string,
    password: string,
    orgUnitId?: string
): Promise<any> {
    const endpoint = orgUnitId
        ? `api/organisationUnits/${orgUnitId}.json?fields=id,displayName,children[id,displayName,children::isNotEmpty]`
        : 'api/organisationUnits.json?fields=id,displayName,level&filter=level:eq:1&paging=false'

    const cacheKey = generateCacheKey(url, username, password, endpoint)

    return cacheService.wrap(
        cacheKey,
        async () => {
            const baseUrl = url.replace(/\/$/, '')
            const auth = Buffer.from(`${username}:${password}`).toString('base64')

            const response = await fetch(`${baseUrl}/${endpoint}`, {
                headers: { Authorization: `Basic ${auth}` },
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch org units: ${response.status}`)
            }

            return await response.json()
        },
        { ttl: CACHE_TTL.orgUnits }
    )
}

/**
 * Fetch DHIS2 data values with caching
 */
export async function fetchDataValuesCached(
    url: string,
    username: string,
    password: string,
    params: {
        dataSet?: string
        dataElement?: string[]
        orgUnit: string
        period: string
    }
): Promise<any> {
    // Build query string
    const queryParams = new URLSearchParams()
    if (params.dataSet) queryParams.append('dataSet', params.dataSet)
    if (params.dataElement) {
        params.dataElement.forEach(de => queryParams.append('dataElement', de))
    }
    queryParams.append('orgUnit', params.orgUnit)
    queryParams.append('period', params.period)

    const endpoint = `api/dataValueSets.json?${queryParams.toString()}`
    const cacheKey = generateCacheKey(url, username, password, endpoint)

    return cacheService.wrap(
        cacheKey,
        async () => {
            const baseUrl = url.replace(/\/$/, '')
            const auth = Buffer.from(`${username}:${password}`).toString('base64')

            const response = await fetch(`${baseUrl}/${endpoint}`, {
                headers: { Authorization: `Basic ${auth}` },
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch data values: ${response.status}`)
            }

            return await response.json()
        },
        { ttl: CACHE_TTL.dataValues }
    )
}

/**
 * Validate authentication with caching
 */
export async function validateAuthCached(
    url: string,
    username: string,
    password: string
): Promise<any> {
    const endpoint = 'api/me.json'
    const cacheKey = generateCacheKey(url, username, password, endpoint)

    return cacheService.wrap(
        cacheKey,
        async () => {
            const baseUrl = url.replace(/\/$/, '')
            const auth = Buffer.from(`${username}:${password}`).toString('base64')

            const response = await fetch(`${baseUrl}/${endpoint}`, {
                headers: { Authorization: `Basic ${auth}` },
            })

            if (!response.ok) {
                throw new Error(`Authentication failed: ${response.status}`)
            }

            return await response.json()
        },
        { ttl: CACHE_TTL.userInfo }
    )
}

/**
 * Invalidate all cache for a specific DHIS2 instance
 */
export async function invalidateInstanceCache(
    url: string,
    username: string,
    password: string
): Promise<void> {
    const credHash = crypto
        .createHash('sha256')
        .update(`${username}:${password}`)
        .digest('hex')
        .substring(0, 16)

    const baseUrl = url.replace(/\/$/, '')
    const pattern = `dhis2:${credHash}:${baseUrl}:*`

    await cacheService.deletePattern(pattern)
    console.log(`[DHIS2 Cache] Invalidated cache for ${baseUrl}`)
}

/**
 * Invalidate cache for specific resource type
 */
export async function invalidateResourceCache(
    url: string,
    username: string,
    password: string,
    resourceType: 'datasets' | 'dataElements' | 'orgUnits' | 'dataValues'
): Promise<void> {
    const credHash = crypto
        .createHash('sha256')
        .update(`${username}:${password}`)
        .digest('hex')
        .substring(0, 16)

    const baseUrl = url.replace(/\/$/, '')
    const pattern = `dhis2:${credHash}:${baseUrl}:*${resourceType}*`

    await cacheService.deletePattern(pattern)
    console.log(`[DHIS2 Cache] Invalidated ${resourceType} cache for ${baseUrl}`)
}

/**
 * Get cache statistics for DHIS2 resources
 */
export function getDHIS2CacheStats() {
    return cacheService.getStats()
}
