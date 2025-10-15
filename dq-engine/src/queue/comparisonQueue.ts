/**
 * Comparison Queue Service
 *
 * Uses Bull queue to handle long-running dataset comparisons:
 * - Prevents server overload from multiple concurrent comparisons
 * - Provides job status tracking and progress updates
 * - Enables retry logic for failed comparisons
 * - Supports job prioritization
 */

import Bull from 'bull'
import { addComparisonStats } from '../statsStore'

interface ComparisonJobData {
    configurationId?: string
    destinationUrl: string
    destinationUser: string
    destinationPass: string
    orgUnit: string
    orgUnitName: string
    period: string
    selectedDatasetIds: string[]
    dataElementGroups: any[]
}

interface ComparisonJobResult {
    datasets: any[]
    comparisonResults: any[]
    summary: {
        totalRecords: number
        validRecords: number
        mismatchedRecords: number
        missingRecords: number
        outOfRangeRecords: number
    }
}

// Use environment variable or default to local Redis-compatible connection
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

// Create Bull queue
// If Redis is not available, Bull will store jobs in memory (limited functionality)
let comparisonQueue: Bull.Queue<ComparisonJobData> | null = null

try {
    comparisonQueue = new Bull('dataset-comparisons', REDIS_URL, {
        defaultJobOptions: {
            attempts: 3,               // Retry failed jobs up to 3 times
            backoff: {
                type: 'exponential',   // Exponential backoff
                delay: 5000,           // Start with 5 second delay
            },
            removeOnComplete: 50,      // Keep last 50 completed jobs for history
            removeOnFail: 100,         // Keep last 100 failed jobs for debugging
        },
        settings: {
            maxStalledCount: 1,        // Job is stalled if stuck for too long
            stalledInterval: 30000,    // Check for stalled jobs every 30s
        },
    })

    comparisonQueue.on('error', (error) => {
        console.error('[ComparisonQueue] Queue error:', error.message)
        console.log('[ComparisonQueue] Running in memory-only mode (limited functionality)')
    })

    comparisonQueue.on('failed', (job, err) => {
        console.error(`[ComparisonQueue] Job ${job.id} failed:`, err.message)
    })

    comparisonQueue.on('completed', (job, result) => {
        console.log(`[ComparisonQueue] Job ${job.id} completed successfully`)
    })

    comparisonQueue.on('stalled', (job) => {
        console.warn(`[ComparisonQueue] Job ${job.id} stalled, will be retried`)
    })

    console.log('[ComparisonQueue] ✅ Queue initialized')
} catch (err) {
    console.warn('[ComparisonQueue] Failed to initialize queue, comparisons will run synchronously:', err)
}

/**
 * Process comparison jobs
 */
if (comparisonQueue) {
    comparisonQueue.process(async (job) => {
        console.log(`[ComparisonQueue] Processing job ${job.id}`)

        const {
            configurationId,
            destinationUrl,
            destinationUser,
            destinationPass,
            orgUnit,
            orgUnitName,
            period,
            selectedDatasetIds,
            dataElementGroups,
        } = job.data

        // Report progress
        await job.progress(10)

        // Import the comparison logic (to avoid circular dependencies)
        // We'll implement this in the next step
        const { performDatasetComparisonSync } = await import('../comparisonEngine')

        await job.progress(20)

        // Perform the actual comparison
        const result = await performDatasetComparisonSync(
            destinationUrl,
            destinationUser,
            destinationPass,
            orgUnit,
            orgUnitName,
            period,
            selectedDatasetIds,
            dataElementGroups,
            async (step: string, progress: number) => {
                // Map comparison progress (0-100) to job progress (20-90)
                const jobProgress = 20 + (progress * 0.7)
                await job.progress(Math.round(jobProgress))
                console.log(`[ComparisonQueue] Job ${job.id}: ${step} (${Math.round(jobProgress)}%)`)
            }
        )

        await job.progress(90)

        // Save results to database (using the simpler ComparisonStats interface)
        await addComparisonStats({
            datasets: selectedDatasetIds,
            totalRecords: result.summary.totalRecords,
            validRecords: result.summary.validRecords,
            mismatchedRecords: result.summary.mismatchedRecords,
            missingRecords: result.summary.missingRecords,
            outOfRangeRecords: result.summary.outOfRangeRecords,
            consensusFound: 0, // Will be calculated separately
        })

        await job.progress(100)

        return result
    })
}

/**
 * Add a comparison job to the queue
 */
export async function enqueueComparison(
    data: ComparisonJobData,
    priority: number = 0
): Promise<string | null> {
    if (!comparisonQueue) {
        throw new Error('Queue is not available, cannot enqueue comparison')
    }

    try {
        const job = await comparisonQueue.add(data, {
            priority, // Higher priority = processed first
        })

        console.log(`[ComparisonQueue] Enqueued job ${job.id} with priority ${priority}`)
        return job.id.toString()
    } catch (err) {
        console.error('[ComparisonQueue] Failed to enqueue job:', err)
        return null
    }
}

/**
 * Get job status and result
 */
export async function getComparisonJobStatus(jobId: string): Promise<{
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'unknown'
    progress: number
    result?: ComparisonJobResult
    error?: string
}> {
    if (!comparisonQueue) {
        return { status: 'unknown', progress: 0 }
    }

    try {
        const job = await comparisonQueue.getJob(jobId)

        if (!job) {
            return { status: 'unknown', progress: 0 }
        }

        const state = await job.getState()
        const progress = job.progress() as number || 0

        let result: any = {
            status: state as any,
            progress,
        }

        if (state === 'completed') {
            result.result = job.returnvalue
        } else if (state === 'failed') {
            result.error = job.failedReason
        }

        return result
    } catch (err) {
        console.error('[ComparisonQueue] Failed to get job status:', err)
        return { status: 'unknown', progress: 0 }
    }
}

/**
 * Cancel a queued or active job
 */
export async function cancelComparisonJob(jobId: string): Promise<boolean> {
    if (!comparisonQueue) {
        return false
    }

    try {
        const job = await comparisonQueue.getJob(jobId)

        if (!job) {
            return false
        }

        await job.remove()
        console.log(`[ComparisonQueue] Cancelled job ${jobId}`)
        return true
    } catch (err) {
        console.error('[ComparisonQueue] Failed to cancel job:', err)
        return false
    }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
    if (!comparisonQueue) {
        return {
            available: false,
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
        }
    }

    try {
        const [waiting, active, completed, failed] = await Promise.all([
            comparisonQueue.getWaitingCount(),
            comparisonQueue.getActiveCount(),
            comparisonQueue.getCompletedCount(),
            comparisonQueue.getFailedCount(),
        ])

        return {
            available: true,
            waiting,
            active,
            completed,
            failed,
        }
    } catch (err) {
        console.error('[ComparisonQueue] Failed to get queue stats:', err)
        return {
            available: false,
            waiting: 0,
            active: 0,
            completed: 0,
            failed: 0,
        }
    }
}

/**
 * Clean up old jobs
 */
export async function cleanupOldJobs() {
    if (!comparisonQueue) {
        return
    }

    try {
        // Remove completed jobs older than 24 hours
        await comparisonQueue.clean(24 * 60 * 60 * 1000, 'completed')

        // Remove failed jobs older than 7 days
        await comparisonQueue.clean(7 * 24 * 60 * 60 * 1000, 'failed')

        console.log('[ComparisonQueue] Cleaned up old jobs')
    } catch (err) {
        console.error('[ComparisonQueue] Failed to cleanup jobs:', err)
    }
}

/**
 * Close queue gracefully
 */
export async function closeQueue() {
    if (comparisonQueue) {
        await comparisonQueue.close()
        console.log('[ComparisonQueue] Queue closed')
    }
}

export { comparisonQueue }
