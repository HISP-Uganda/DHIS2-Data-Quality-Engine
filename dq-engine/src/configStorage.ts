import { getDb } from './db/connection'
import { encrypt, decrypt, ensureEncrypted, ensureDecrypted } from './utils/encryption'
import { ComparisonConfiguration, SavedConfigurationSummary } from './types'
import { v4 as uuidv4 } from 'uuid'

export class ConfigurationStorage {
  /**
   * Get all configurations as summaries
   */
  static getAllSummaries(): SavedConfigurationSummary[] {
    const db = getDb()

    const stmt = db.prepare(`
      SELECT
        id,
        name,
        description,
        json_array_length(selected_datasets) as datasetCount,
        json_array_length(data_element_groups) as groupCount,
        created_at as createdAt,
        last_run_at as lastRunAt,
        is_active as isActive
      FROM configurations
      ORDER BY created_at DESC
    `)

    const rows = stmt.all() as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      datasetCount: row.datasetCount || 0,
      groupCount: row.groupCount || 0,
      createdAt: row.createdAt,
      lastRunAt: row.lastRunAt,
      isActive: Boolean(row.isActive)
    }))
  }

  /**
   * Get a configuration by ID
   */
  static getById(id: string): ComparisonConfiguration | null {
    const db = getDb()

    const stmt = db.prepare(`
      SELECT * FROM configurations WHERE id = ?
    `)

    const row = stmt.get(id) as any

    if (!row) {
      return null
    }

    return this.rowToConfig(row)
  }

  /**
   * Save a new configuration
   */
  static save(
    config: Omit<ComparisonConfiguration, 'id' | 'createdAt' | 'updatedAt'>
  ): ComparisonConfiguration {
    const db = getDb()

    const id = uuidv4()
    const now = new Date().toISOString()

    // Log what's being saved (masked for security)
    console.log(`[ConfigStorage] Saving new config "${config.name}":`, {
      sourceUser: config.sourceUser,
      sourcePassLength: config.sourcePass?.length,
      sourcePassIsMasked: config.sourcePass === '***',
      destUser: config.destinationUser,
      destPassLength: config.destinationPass?.length,
      destPassIsMasked: config.destinationPass === '***'
    })

    // Check if passwords are masked
    if (config.sourcePass === '***' || config.destinationPass === '***') {
      throw new Error('Cannot save configuration with masked passwords. Please provide actual passwords.')
    }

    // Encrypt passwords
    const sourcePassEncrypted = ensureEncrypted(config.sourcePass)
    const destinationPassEncrypted = ensureEncrypted(config.destinationPass)

    const stmt = db.prepare(`
      INSERT INTO configurations (
        id, name, description,
        source_url, source_user, source_pass_encrypted,
        selected_source_dataset, selected_source_org_units, selected_source_org_names,
        selected_data_elements, period,
        destination_url, destination_user, destination_pass_encrypted,
        selected_dest_dataset, selected_dest_org_units, selected_dest_org_names,
        data_element_mapping,
        source_org_unit_tree, destination_org_unit_tree,
        selected_datasets, data_element_groups,
        is_active, created_at, updated_at
      ) VALUES (
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?,
        ?, ?,
        ?, ?,
        ?, ?, ?
      )
    `)

    stmt.run(
      id, config.name, config.description || null,
      config.sourceUrl, config.sourceUser, sourcePassEncrypted,
      config.selectedSourceDataset || null,
      JSON.stringify(config.selectedSourceOrgUnits || []),
      JSON.stringify(config.selectedSourceOrgNames || []),
      JSON.stringify(config.selectedDataElements || []),
      config.period || null,
      config.destinationUrl, config.destinationUser, destinationPassEncrypted,
      config.selectedDestDataset || null,
      JSON.stringify(config.selectedDestOrgUnits || []),
      JSON.stringify(config.selectedDestOrgNames || []),
      config.dataElementMapping || null,
      config.sourceOrgUnitTree ? JSON.stringify(config.sourceOrgUnitTree) : null,
      config.destinationOrgUnitTree ? JSON.stringify(config.destinationOrgUnitTree) : null,
      JSON.stringify(config.selectedDatasets || []),
      JSON.stringify(config.dataElementGroups || []),
      config.isActive !== false ? 1 : 0,
      now, now
    )

    console.log(`[ConfigStorage] ✅ Saved configuration: ${config.name} (${id})`)

    // Return the saved configuration
    return this.getById(id)!
  }

  /**
   * Update an existing configuration
   */
  static update(
    id: string,
    updates: Partial<Omit<ComparisonConfiguration, 'id' | 'createdAt'>>
  ): ComparisonConfiguration | null {
    const db = getDb()

    // Check if configuration exists
    const existing = this.getById(id)
    if (!existing) {
      return null
    }

    const now = new Date().toISOString()

    // Build update query dynamically based on provided fields
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) {
      fields.push('name = ?')
      values.push(updates.name)
    }
    if (updates.description !== undefined) {
      fields.push('description = ?')
      values.push(updates.description)
    }
    if (updates.sourceUrl !== undefined) {
      fields.push('source_url = ?')
      values.push(updates.sourceUrl)
    }
    if (updates.sourceUser !== undefined) {
      fields.push('source_user = ?')
      values.push(updates.sourceUser)
    }
    if (updates.sourcePass !== undefined) {
      fields.push('source_pass_encrypted = ?')
      values.push(ensureEncrypted(updates.sourcePass))
    }
    if (updates.destinationUrl !== undefined) {
      fields.push('destination_url = ?')
      values.push(updates.destinationUrl)
    }
    if (updates.destinationUser !== undefined) {
      fields.push('destination_user = ?')
      values.push(updates.destinationUser)
    }
    if (updates.destinationPass !== undefined) {
      fields.push('destination_pass_encrypted = ?')
      values.push(ensureEncrypted(updates.destinationPass))
    }
    if (updates.selectedDatasets !== undefined) {
      fields.push('selected_datasets = ?')
      values.push(JSON.stringify(updates.selectedDatasets))
    }
    if (updates.dataElementGroups !== undefined) {
      fields.push('data_element_groups = ?')
      values.push(JSON.stringify(updates.dataElementGroups))
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?')
      values.push(updates.isActive ? 1 : 0)
    }

    // Always update updated_at
    fields.push('updated_at = ?')
    values.push(now)

    // Add ID at the end
    values.push(id)

    const stmt = db.prepare(`
      UPDATE configurations
      SET ${fields.join(', ')}
      WHERE id = ?
    `)

    stmt.run(...values)

    console.log(`[ConfigStorage] ✅ Updated configuration: ${updates.name || existing.name} (${id})`)

    return this.getById(id)
  }

  /**
   * Mark configuration as run
   */
  static markAsRun(id: string): boolean {
    const db = getDb()

    const stmt = db.prepare(`
      UPDATE configurations
      SET last_run_at = ?
      WHERE id = ?
    `)

    const result = stmt.run(new Date().toISOString(), id)

    return result.changes > 0
  }

  /**
   * Delete a configuration
   */
  static delete(id: string): boolean {
    const db = getDb()

    const stmt = db.prepare(`
      DELETE FROM configurations WHERE id = ?
    `)

    const result = stmt.run(id)

    if (result.changes > 0) {
      console.log(`[ConfigStorage] ✅ Deleted configuration: ${id}`)
      return true
    }

    return false
  }

  /**
   * Toggle active status
   */
  static toggleActive(id: string): ComparisonConfiguration | null {
    const db = getDb()

    const config = this.getById(id)
    if (!config) {
      return null
    }

    const newStatus = !config.isActive

    const stmt = db.prepare(`
      UPDATE configurations
      SET is_active = ?, updated_at = ?
      WHERE id = ?
    `)

    stmt.run(newStatus ? 1 : 0, new Date().toISOString(), id)

    console.log(`[ConfigStorage] ✅ Toggled configuration status: ${config.name} -> ${newStatus ? 'Active' : 'Inactive'}`)

    return this.getById(id)
  }

  /**
   * Convert database row to ComparisonConfiguration object
   */
  private static rowToConfig(row: any): ComparisonConfiguration {
    // Decrypt passwords
    const sourcePassDecrypted = ensureDecrypted(row.source_pass_encrypted)
    const destinationPassDecrypted = ensureDecrypted(row.destination_pass_encrypted)

    console.log(`[ConfigStorage] Decrypting config ${row.id}:`, {
      sourcePassEncrypted: row.source_pass_encrypted ? `${row.source_pass_encrypted.substring(0, 20)}...` : 'null',
      sourcePassDecryptedLength: sourcePassDecrypted?.length,
      destPassEncrypted: row.destination_pass_encrypted ? `${row.destination_pass_encrypted.substring(0, 20)}...` : 'null',
      destPassDecryptedLength: destinationPassDecrypted?.length
    })

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sourceUrl: row.source_url,
      sourceUser: row.source_user,
      sourcePass: sourcePassDecrypted,
      selectedSourceDataset: row.selected_source_dataset || '',
      selectedSourceOrgUnits: JSON.parse(row.selected_source_org_units || '[]'),
      selectedSourceOrgNames: JSON.parse(row.selected_source_org_names || '[]'),
      selectedDataElements: JSON.parse(row.selected_data_elements || '[]'),
      period: row.period || '',
      destinationUrl: row.destination_url,
      destinationUser: row.destination_user,
      destinationPass: destinationPassDecrypted,
      selectedDestDataset: row.selected_dest_dataset || '',
      selectedDestOrgUnits: JSON.parse(row.selected_dest_org_units || '[]'),
      selectedDestOrgNames: JSON.parse(row.selected_dest_org_names || '[]'),
      dataElementMapping: row.data_element_mapping || '',
      sourceOrgUnitTree: row.source_org_unit_tree ? JSON.parse(row.source_org_unit_tree) : undefined,
      destinationOrgUnitTree: row.destination_org_unit_tree ? JSON.parse(row.destination_org_unit_tree) : undefined,
      selectedDatasets: JSON.parse(row.selected_datasets || '[]'),
      dataElementGroups: JSON.parse(row.data_element_groups || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastRunAt: row.last_run_at,
      isActive: Boolean(row.is_active)
    }
  }
}
