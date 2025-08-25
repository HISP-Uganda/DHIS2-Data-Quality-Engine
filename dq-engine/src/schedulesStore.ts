import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

const DB_FILE = path.resolve(__dirname, '../data/schedules.json')

if (!fs.existsSync(path.dirname(DB_FILE))) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
}
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, '[]')
}

export interface Schedule {
    id: string
    name: string
    cron: string
    orgUnit: string
    period: string
    enabled: boolean

    sourceUrl: string
    sourceUser: string
    sourcePass: string
    dataElements: string[]
    datasetDC: string

    createdAt: string
}

let schedules: Schedule[] = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'))

function persist() {
    fs.writeFileSync(DB_FILE, JSON.stringify(schedules, null, 2))
}

export function listSchedules(): Schedule[] {
    return schedules
}

export function addSchedule(data: Omit<Schedule, 'id' | 'createdAt'>): Schedule {
    const newSched: Schedule = {
        id: uuid(),
        createdAt: new Date().toISOString(),
        ...data,
    }
    schedules.push(newSched)
    persist()
    return newSched
}

export function updateSchedule(
    id: string,
    updates: Partial<Omit<Schedule, 'id' | 'createdAt'>>
): Schedule | undefined {
    const idx = schedules.findIndex(s => s.id === id)
    if (idx === -1) return undefined
    schedules[idx] = { ...schedules[idx], ...updates }
    persist()
    return schedules[idx]
}

export function deleteSchedule(id: string): boolean {
    const before = schedules.length
    schedules = schedules.filter(s => s.id !== id)
    const changed = schedules.length !== before
    if (changed) persist()
    return changed
}
