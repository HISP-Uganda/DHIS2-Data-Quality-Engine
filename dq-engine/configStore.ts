import fs from 'fs'
import path from 'path'

export interface Config {
    dhis2SourceUrl: string
    dhis2TargetUrl: string
    datasetDA: string
    datasetDB: string
    datasetDC: string
}

const FILE = path.resolve(__dirname, '../data/config.json')

if (!fs.existsSync(path.dirname(FILE))) fs.mkdirSync(path.dirname(FILE), { recursive: true })
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({
    dhis2SourceUrl: '',
    dhis2TargetUrl: '',
    datasetDA: '',
    datasetDB: '',
    datasetDC: ''
}, null, 2))

let _cfg: Config = JSON.parse(fs.readFileSync(FILE, 'utf-8'))

function persist() {
    fs.writeFileSync(FILE, JSON.stringify(_cfg, null, 2))
}

export function getConfig(): Config {
    return _cfg
}

export function updateConfig(updates: Partial<Config>): Config {
    _cfg = { ..._cfg, ...updates }
    persist()
    return _cfg
}
