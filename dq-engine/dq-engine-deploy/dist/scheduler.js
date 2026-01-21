"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initScheduler = initScheduler;
exports.scheduleJob = scheduleJob;
exports.cancelJob = cancelJob;
const cron = __importStar(require("node-cron"));
const schedulesStore_1 = require("./schedulesStore");
const engine_1 = require("./engine");
const tasks = new Map();
function initScheduler() {
    (0, schedulesStore_1.listSchedules)().forEach(s => {
        scheduleJob(s);
        console.log(`Scheduled job ${s.id} (${s.cron}), enabled=${s.enabled}`);
    });
}
function scheduleJob(sched) {
    cancelJob(sched.id);
    const task = cron.schedule(sched.cron, async () => {
        console.log(`[${new Date().toISOString()}] ▶ Running DQ job ${sched.id}`);
        try {
            await (0, engine_1.runDQ)({
                sourceUrl: sched.sourceUrl,
                sourceUser: sched.sourceUser,
                sourcePass: sched.sourcePass,
                dataElements: sched.dataElements,
                datasetDC: sched.datasetDC,
                orgUnit: sched.orgUnit,
                period: sched.period,
            });
            console.log(`[${sched.id}] ✅ Success`);
        }
        catch (err) {
            console.error(`[${sched.id}] ❌ Error:`, err);
        }
    });
    if (!sched.enabled) {
        task.stop();
    }
    tasks.set(sched.id, task);
    console.log(`→ Job ${sched.id} is now ${sched.enabled ? 'running' : 'stopped'}`);
}
function cancelJob(id) {
    const task = tasks.get(id);
    if (task) {
        task.destroy();
        tasks.delete(id);
        console.log(`← Cancelled job ${id}`);
    }
}
