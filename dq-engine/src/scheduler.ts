import * as cron from 'node-cron'
import { listSchedules, Schedule } from './schedulesStore'
import { runDQ } from './engine'

const tasks = new Map<string, cron.ScheduledTask>()

export function initScheduler() {
    listSchedules().forEach(s => {
        scheduleJob(s)
        console.log(`Scheduled job ${s.id} (${s.cron}), enabled=${s.enabled}`)
    })
}

export function scheduleJob(sched: Schedule) {
    cancelJob(sched.id)

    const task = cron.schedule(sched.cron, async () => {
        console.log(`[${new Date().toISOString()}] ▶ Running DQ job ${sched.id}`)
        try {

            await runDQ({
                sourceUrl: sched.sourceUrl,
                sourceUser: sched.sourceUser,
                sourcePass: sched.sourcePass,
                dataElements: sched.dataElements,
                datasetDC: sched.datasetDC,
                orgUnit: sched.orgUnit,
                period: sched.period,
            })
            console.log(`[${sched.id}] ✅ Success`)
        } catch (err) {
            console.error(`[${sched.id}] ❌ Error:`, err)
        }
    })

    if (!sched.enabled) {
        task.stop()
    }

    tasks.set(sched.id, task)
    console.log(`→ Job ${sched.id} is now ${sched.enabled ? 'running' : 'stopped'}`)
}

export function cancelJob(id: string) {
    const task = tasks.get(id)
    if (task) {
        task.destroy()
        tasks.delete(id)
        console.log(`← Cancelled job ${id}`)
    }
}
