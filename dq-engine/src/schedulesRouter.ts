import { Router, Request, Response } from 'express'
import {
    listSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    Schedule,
} from './schedulesStore'
import { scheduleJob, cancelJob } from './scheduler'

const router = Router()

router.get('/schedules', (req: Request, res: Response) => {
    res.json(listSchedules())
})

router.post('/schedules', (req: Request, res: Response) => {
    const { name, cron, orgUnit, period, enabled } = req.body
    const sched = addSchedule({
        name, cron, orgUnit, period, enabled,
        sourceUrl: '',
        sourceUser: '',
        sourcePass: '',
        dataElements: [],
        datasetDC: ''
    })
    if (sched.enabled) {
        scheduleJob(sched)
    }
    res.status(201).json(sched)
})

router.put('/schedules/:id', (req: Request<{ id: string }>, res: Response) => {
    const sched = updateSchedule(req.params.id, req.body)
    if (!sched) {
        res.sendStatus(404)
        return
    }
    cancelJob(sched.id)
    if (sched.enabled) {
        scheduleJob(sched)
    }
    res.json(sched)
})

router.delete('/schedules/:id', (req: Request<{ id: string }>, res: Response) => {
    const ok = deleteSchedule(req.params.id)
    if (ok) {
        cancelJob(req.params.id)
        res.sendStatus(204)
    } else {
        res.sendStatus(404)
    }
})

export default router
