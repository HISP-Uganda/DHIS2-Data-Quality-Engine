import express from 'express'
import { getConfig, updateConfig, Config } from './configStore'

const router = express.Router()

router.get('/api/config', (_req, res) => {
    res.json(getConfig())
})

router.put('/api/config', (req, res) => {
    const updates = req.body as Partial<Config>
    const updated = updateConfig(updates)
    res.json(updated)
})

export default router
