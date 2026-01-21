"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const schedulesStore_1 = require("./schedulesStore");
const scheduler_1 = require("./scheduler");
const router = (0, express_1.Router)();
router.get('/schedules', (req, res) => {
    res.json((0, schedulesStore_1.listSchedules)());
});
router.post('/schedules', (req, res) => {
    const { name, cron, orgUnit, period, enabled } = req.body;
    const sched = (0, schedulesStore_1.addSchedule)({
        name, cron, orgUnit, period, enabled,
        sourceUrl: '',
        sourceUser: '',
        sourcePass: '',
        dataElements: [],
        datasetDC: ''
    });
    if (sched.enabled) {
        (0, scheduler_1.scheduleJob)(sched);
    }
    res.status(201).json(sched);
});
router.put('/schedules/:id', (req, res) => {
    const sched = (0, schedulesStore_1.updateSchedule)(req.params.id, req.body);
    if (!sched) {
        res.sendStatus(404);
        return;
    }
    (0, scheduler_1.cancelJob)(sched.id);
    if (sched.enabled) {
        (0, scheduler_1.scheduleJob)(sched);
    }
    res.json(sched);
});
router.delete('/schedules/:id', (req, res) => {
    const ok = (0, schedulesStore_1.deleteSchedule)(req.params.id);
    if (ok) {
        (0, scheduler_1.cancelJob)(req.params.id);
        res.sendStatus(204);
    }
    else {
        res.sendStatus(404);
    }
});
exports.default = router;
