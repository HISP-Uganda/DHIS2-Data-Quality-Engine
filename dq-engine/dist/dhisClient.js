"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDhis2Client = createDhis2Client;
const axios_1 = __importDefault(require("axios"));
function createDhis2Client(cfg) {
    return axios_1.default.create({
        baseURL: cfg.url,
        auth: { username: cfg.user, password: cfg.pass }
    });
}
