"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSchedules = listSchedules;
exports.addSchedule = addSchedule;
exports.updateSchedule = updateSchedule;
exports.deleteSchedule = deleteSchedule;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const DB_FILE = path_1.default.resolve(__dirname, '../data/schedules.json');
if (!fs_1.default.existsSync(path_1.default.dirname(DB_FILE))) {
    fs_1.default.mkdirSync(path_1.default.dirname(DB_FILE), { recursive: true });
}
if (!fs_1.default.existsSync(DB_FILE)) {
    fs_1.default.writeFileSync(DB_FILE, '[]');
}
let schedules = JSON.parse(fs_1.default.readFileSync(DB_FILE, 'utf-8'));
function persist() {
    fs_1.default.writeFileSync(DB_FILE, JSON.stringify(schedules, null, 2));
}
function listSchedules() {
    return schedules;
}
function addSchedule(data) {
    const newSched = {
        id: (0, uuid_1.v4)(),
        createdAt: new Date().toISOString(),
        ...data,
    };
    schedules.push(newSched);
    persist();
    return newSched;
}
function updateSchedule(id, updates) {
    const idx = schedules.findIndex(s => s.id === id);
    if (idx === -1)
        return undefined;
    schedules[idx] = { ...schedules[idx], ...updates };
    persist();
    return schedules[idx];
}
function deleteSchedule(id) {
    const before = schedules.length;
    schedules = schedules.filter(s => s.id !== id);
    const changed = schedules.length !== before;
    if (changed)
        persist();
    return changed;
}
