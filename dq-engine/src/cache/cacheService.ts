/**
 * Cache Service
 *
 * Provides a flexible caching layer that can use either:
 * - In-memory cache (default, fast but not persistent)
 * - Redis (optional, persistent and scalable)
 *
 * To use Redis, set REDIS_URL in .env
 */

import Redis from 'ioredis'

interface CacheOptions {
    ttl?: number // Time to live in seconds (default: 300 = 5 minutes)
}

interface CacheEntry<T> {
    data: T
    expiresAt: number
}

class CacheService {
    private redis: Redis | null = null
    private memoryCache: Map<string, CacheEntry<any>> = new Map()
    private cleanupInterval: NodeJS.Timeout | null = null
    private isRedisAvailable: boolean = false

    constructor() {
        this.initializeRedis()
        this.startCleanupInterval()
    }

    /**
     * Initialize Redis connection if REDIS_URL is provided
     */
    private initializeRedis() {
        const redisUrl = process.env.REDIS_URL

        if (redisUrl) {
            try {
                this.redis = new Redis(redisUrl, {
                    retryStrategy: (times) => {
                        if (times > 3) {
                            console.warn('[Cache] Redis connection failed after 3 retries, falling back to memory cache')
                            this.isRedisAvailable = false
                            return null
                        }
                        return Math.min(times * 100, 2000)
                    },
                    enableOfflineQueue: false,
                })

                this.redis.on('connect', () => {
                    console.log('[Cache] ✅ Redis connected')
                    this.isRedisAvailable = true
                })

                this.redis.on('error', (err) => {
                    console.warn('[Cache] Redis error, falling back to memory cache:', err.message)
                    this.isRedisAvailable = false
                })
            } catch (err) {
                console.warn('[Cache] Failed to initialize Redis, using memory cache:', err)
                this.redis = null
            }
        } else {
            console.log('[Cache] Using in-memory cache (set REDIS_URL to enable Redis)')
        }
    }

    /**
     * Start interval to clean up expired memory cache entries
     */
    private startCleanupInterval() {
        // Clean up expired entries every minute
        this.cleanupInterval = setInterval(() => {
            this.cleanupMemoryCache()
        }, 60000)
    }

    /**
     * Remove expired entries from memory cache
     */
    private cleanupMemoryCache() {
        const now = Date.now()
        let removed = 0

        for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.expiresAt < now) {
                this.memoryCache.delete(key)
                removed++
            }
        }

        if (removed > 0) {
            console.log(`[Cache] Cleaned up ${removed} expired entries`)
        }
    }

    /**
     * Get cached value
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            // Try Redis first if available
            if (this.redis && this.isRedisAvailable) {
                const value = await this.redis.get(key)
                if (value) {
                    return JSON.parse(value) as T
                }
                return null
            }

            // Fallback to memory cache
            const entry = this.memoryCache.get(key)
            if (!entry) {
                return null
            }

            // Check if expired
            if (entry.expiresAt < Date.now()) {
                this.memoryCache.delete(key)
                return null
            }

            return entry.data as T
        } catch (err) {
            console.error('[Cache] Get error:', err)
            return null
        }
    }

    /**
     * Set cached value
     */
    async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
        const ttl = options.ttl || 300 // Default 5 minutes

        try {
            // Try Redis first if available
            if (this.redis && this.isRedisAvailable) {
                await this.redis.setex(key, ttl, JSON.stringify(value))
                return
            }

            // Fallback to memory cache
            const expiresAt = Date.now() + (ttl * 1000)
            this.memoryCache.set(key, {
                data: value,
                expiresAt,
            })
        } catch (err) {
            console.error('[Cache] Set error:', err)
        }
    }

    /**
     * Delete cached value
     */
    async delete(key: string): Promise<void> {
        try {
            if (this.redis && this.isRedisAvailable) {
                await this.redis.del(key)
                return
            }

            this.memoryCache.delete(key)
        } catch (err) {
            console.error('[Cache] Delete error:', err)
        }
    }

    /**
     * Delete all cached values matching a pattern
     */
    async deletePattern(pattern: string): Promise<void> {
        try {
            if (this.redis && this.isRedisAvailable) {
                const keys = await this.redis.keys(pattern)
                if (keys.length > 0) {
                    await this.redis.del(...keys)
                }
                return
            }

            // For memory cache, use simple string matching
            const regex = new RegExp(pattern.replace('*', '.*'))
            for (const key of this.memoryCache.keys()) {
                if (regex.test(key)) {
                    this.memoryCache.delete(key)
                }
            }
        } catch (err) {
            console.error('[Cache] Delete pattern error:', err)
        }
    }

    /**
     * Clear all cache
     */
    async clear(): Promise<void> {
        try {
            if (this.redis && this.isRedisAvailable) {
                await this.redis.flushdb()
                return
            }

            this.memoryCache.clear()
        } catch (err) {
            console.error('[Cache] Clear error:', err)
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        if (this.redis && this.isRedisAvailable) {
            return {
                type: 'redis',
                available: true,
            }
        }

        return {
            type: 'memory',
            available: true,
            size: this.memoryCache.size,
        }
    }

    /**
     * Gracefully close connections
     */
    async close() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
        }

        if (this.redis) {
            await this.redis.quit()
        }

        this.memoryCache.clear()
    }

    /**
     * Wrapper for caching function results
     */
    async wrap<T>(
        key: string,
        fn: () => Promise<T>,
        options: CacheOptions = {}
    ): Promise<T> {
        // Try to get from cache first
        const cached = await this.get<T>(key)
        if (cached !== null) {
            console.log(`[Cache] HIT: ${key}`)
            return cached
        }

        console.log(`[Cache] MISS: ${key}`)

        // Execute function and cache result
        const result = await fn()
        await this.set(key, result, options)

        return result
    }
}

// Export singleton instance
export const cacheService = new CacheService()
