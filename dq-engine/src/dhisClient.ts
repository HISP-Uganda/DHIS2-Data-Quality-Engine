import axios, { AxiosInstance } from 'axios';

export interface Dhis2Config { url: string; user: string; pass: string; }

export function createDhis2Client(cfg: Dhis2Config): AxiosInstance {
    return axios.create({
        baseURL: cfg.url,
        auth: { username: cfg.user, password: cfg.pass }
    });
}
