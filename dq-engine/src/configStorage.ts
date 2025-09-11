import fs from 'fs'
import path from 'path'
import { ComparisonConfiguration, SavedConfigurationSummary } from './types'

const CONFIG_DIR = path.join(__dirname, '..', 'data', 'comparison-configs')
const CONFIG_FILE = path.join(CONFIG_DIR, 'configurations.json')

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

function loadConfigurations(): ComparisonConfiguration[] {
  ensureConfigDir()

  if (!fs.existsSync(CONFIG_FILE)) {
    return []
  }

  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8')
    return JSON.parse(data) as ComparisonConfiguration[]
  } catch (error) {
    console.error('[ConfigStorage] Error loading configurations:', error)
    return []
  }
}

function saveConfigurations(configs: ComparisonConfiguration[]): void {
  ensureConfigDir()

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configs, null, 2))
  } catch (error) {
    console.error('[ConfigStorage] Error saving configurations:', error)
    throw error
  }
}

function generateId(): string {
  return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export class ConfigurationStorage {

  static getAllSummaries(): SavedConfigurationSummary[] {
    const configs = loadConfigurations()
    return configs.map(config => ({
      id: config.id,
      name: config.name,
      description: config.description,
      datasetCount: config.selectedDatasets?.length || 0,
      groupCount: config.dataElementGroups?.length || 0,
      createdAt: config.createdAt,
      lastRunAt: config.lastRunAt,
      isActive: config.isActive
    }))
  }

  static getById(id: string): ComparisonConfiguration | null {
    const configs = loadConfigurations()
    return configs.find(config => config.id === id) || null
  }

  static save(config: Omit<ComparisonConfiguration, 'id' | 'createdAt' | 'updatedAt'>): ComparisonConfiguration {
    const configs = loadConfigurations()

    const newConfig: ComparisonConfiguration = {
      ...config,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    configs.push(newConfig)
    saveConfigurations(configs)

    console.log(`[ConfigStorage] ✅ Saved configuration: ${newConfig.name} (${newConfig.id})`)
    return newConfig
  }

  static update(id: string, updates: Partial<Omit<ComparisonConfiguration, 'id' | 'createdAt'>>): ComparisonConfiguration | null {
    const configs = loadConfigurations()
    const configIndex = configs.findIndex(config => config.id === id)

    if (configIndex === -1) {
      return null
    }

    configs[configIndex] = {
      ...configs[configIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    saveConfigurations(configs)

    console.log(`[ConfigStorage] ✅ Updated configuration: ${configs[configIndex].name} (${id})`)
    return configs[configIndex]
  }

  static markAsRun(id: string): boolean {
    const configs = loadConfigurations()
    const configIndex = configs.findIndex(config => config.id === id)

    if (configIndex === -1) {
      return false
    }

    configs[configIndex].lastRunAt = new Date().toISOString()
    saveConfigurations(configs)

    return true
  }

  static delete(id: string): boolean {
    const configs = loadConfigurations()
    const initialLength = configs.length
    const updatedConfigs = configs.filter(config => config.id !== id)

    if (updatedConfigs.length === initialLength) {
      return false
    }

    saveConfigurations(updatedConfigs)

    console.log(`[ConfigStorage] ✅ Deleted configuration: ${id}`)
    return true
  }

  static toggleActive(id: string): ComparisonConfiguration | null {
    const configs = loadConfigurations()
    const configIndex = configs.findIndex(config => config.id === id)

    if (configIndex === -1) {
      return null
    }

    configs[configIndex].isActive = !configs[configIndex].isActive
    configs[configIndex].updatedAt = new Date().toISOString()

    saveConfigurations(configs)

    console.log(`[ConfigStorage] ✅ Toggled configuration status: ${configs[configIndex].name} -> ${configs[configIndex].isActive ? 'Active' : 'Inactive'}`)
    return configs[configIndex]
  }
}