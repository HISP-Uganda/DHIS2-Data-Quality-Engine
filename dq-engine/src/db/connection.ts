import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let db: Database.Database | null = null

// Get database file path
function getDbPath(): string {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data')

  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  return path.join(dataDir, 'iws-dashboard.db')
}

/**
 * Get the SQLite database instance
 */
export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDbPath()
    console.log(`[DB] Opening SQLite database at: ${dbPath}`)

    db = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
    })

    // Enable foreign keys
    db.pragma('foreign_keys = ON')

    // Performance optimizations
    db.pragma('journal_mode = WAL') // Write-Ahead Logging for better concurrency
    db.pragma('synchronous = NORMAL') // Faster writes, still safe

    console.log('[DB] SQLite database initialized')
  }

  return db
}

/**
 * Close the database connection
 */
export function closeDb(): void {
  if (db) {
    db.close()
    db = null
    console.log('[DB] SQLite database closed')
  }
}

/**
 * Test database connection
 */
export function testConnection(): boolean {
  try {
    const db = getDb()
    const result = db.prepare("SELECT datetime('now') as now").get() as { now: string }
    console.log('[DB] Connection test successful:', result.now)
    return true
  } catch (error) {
    console.error('[DB] Connection test failed:', error)
    return false
  }
}

/**
 * Initialize database schema
 */
export function initializeDatabase(): void {
  try {
    console.log('[DB] Initializing database schema...')
    const db = getDb()

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    // Execute schema
    db.exec(schema)

    console.log('[DB] Database schema initialized successfully')
  } catch (error) {
    console.error('[DB] Failed to initialize database:', error)
    throw error
  }
}

/**
 * Run a transaction
 */
export function transaction<T>(callback: (db: Database.Database) => T): T {
  const db = getDb()

  const transactionFn = db.transaction(callback)
  return transactionFn(db)
}

/**
 * Health check
 */
export function healthCheck(): {
  healthy: boolean
  dbPath: string
  dbSize: number
  inTransaction: boolean
} {
  try {
    const db = getDb()
    const dbPath = getDbPath()
    const stats = fs.statSync(dbPath)

    // Try a simple query
    db.prepare('SELECT 1').get()

    return {
      healthy: true,
      dbPath,
      dbSize: stats.size,
      inTransaction: db.inTransaction
    }
  } catch (error) {
    return {
      healthy: false,
      dbPath: getDbPath(),
      dbSize: 0,
      inTransaction: false
    }
  }
}

/**
 * Backup database to a file
 */
export function backupDatabase(backupPath?: string): string {
  const db = getDb()
  const dbPath = getDbPath()

  if (!backupPath) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const dataDir = path.dirname(dbPath)
    backupPath = path.join(dataDir, `iws-dashboard-backup-${timestamp}.db`)
  }

  console.log(`[DB] Creating backup at: ${backupPath}`)

  // Use SQLite backup API
  db.backup(backupPath)
    .then(() => {
      console.log(`[DB] Backup completed successfully`)
    })
    .catch((error: Error) => {
      console.error(`[DB] Backup failed:`, error)
      throw error
    })

  return backupPath
}

/**
 * Vacuum database (optimize and reclaim space)
 */
export function vacuumDatabase(): void {
  console.log('[DB] Vacuuming database...')
  const db = getDb()
  db.exec('VACUUM')
  console.log('[DB] Database vacuumed successfully')
}

/**
 * Get database statistics
 */
export function getDatabaseStats(): {
  tables: Array<{ name: string; rowCount: number }>
  totalSize: number
  pageSize: number
  pageCount: number
} {
  const db = getDb()
  const dbPath = getDbPath()
  const stats = fs.statSync(dbPath)

  // Get all tables
  const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all() as Array<{ name: string }>

  // Get row count for each table
  const tableStats = tables.map(table => {
    const result = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number }
    return {
      name: table.name,
      rowCount: result.count
    }
  })

  // Get page info
  const pageSize = db.pragma('page_size', { simple: true }) as number
  const pageCount = db.pragma('page_count', { simple: true }) as number

  return {
    tables: tableStats,
    totalSize: stats.size,
    pageSize,
    pageCount
  }
}
