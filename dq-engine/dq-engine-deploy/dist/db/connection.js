"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.closeDb = closeDb;
exports.testConnection = testConnection;
exports.initializeDatabase = initializeDatabase;
exports.transaction = transaction;
exports.healthCheck = healthCheck;
exports.backupDatabase = backupDatabase;
exports.vacuumDatabase = vacuumDatabase;
exports.getDatabaseStats = getDatabaseStats;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let db = null;
// Get database file path
function getDbPath() {
    const dataDir = process.env.DATA_DIR || path_1.default.join(__dirname, '../../data');
    // Ensure data directory exists
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    }
    return path_1.default.join(dataDir, 'iws-dashboard.db');
}
/**
 * Get the SQLite database instance
 */
function getDb() {
    if (!db) {
        const dbPath = getDbPath();
        console.log(`[DB] Opening SQLite database at: ${dbPath}`);
        db = new better_sqlite3_1.default(dbPath, {
            verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
        });
        // Enable foreign keys
        db.pragma('foreign_keys = ON');
        // Performance optimizations
        db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
        db.pragma('synchronous = NORMAL'); // Faster writes, still safe
        console.log('[DB] SQLite database initialized');
    }
    return db;
}
/**
 * Close the database connection
 */
function closeDb() {
    if (db) {
        db.close();
        db = null;
        console.log('[DB] SQLite database closed');
    }
}
/**
 * Test database connection
 */
function testConnection() {
    try {
        const db = getDb();
        const result = db.prepare("SELECT datetime('now') as now").get();
        console.log('[DB] Connection test successful:', result.now);
        return true;
    }
    catch (error) {
        console.error('[DB] Connection test failed:', error);
        return false;
    }
}
/**
 * Initialize database schema
 */
function initializeDatabase() {
    try {
        console.log('[DB] Initializing database schema...');
        const db = getDb();
        // Read schema file
        const schemaPath = path_1.default.join(__dirname, 'schema.sql');
        const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
        // Execute schema
        db.exec(schema);
        console.log('[DB] Database schema initialized successfully');
    }
    catch (error) {
        console.error('[DB] Failed to initialize database:', error);
        throw error;
    }
}
/**
 * Run a transaction
 */
function transaction(callback) {
    const db = getDb();
    const transactionFn = db.transaction(callback);
    return transactionFn(db);
}
/**
 * Health check
 */
function healthCheck() {
    try {
        const db = getDb();
        const dbPath = getDbPath();
        const stats = fs_1.default.statSync(dbPath);
        // Try a simple query
        db.prepare('SELECT 1').get();
        return {
            healthy: true,
            dbPath,
            dbSize: stats.size,
            inTransaction: db.inTransaction
        };
    }
    catch (error) {
        return {
            healthy: false,
            dbPath: getDbPath(),
            dbSize: 0,
            inTransaction: false
        };
    }
}
/**
 * Backup database to a file
 */
function backupDatabase(backupPath) {
    const db = getDb();
    const dbPath = getDbPath();
    if (!backupPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dataDir = path_1.default.dirname(dbPath);
        backupPath = path_1.default.join(dataDir, `iws-dashboard-backup-${timestamp}.db`);
    }
    console.log(`[DB] Creating backup at: ${backupPath}`);
    // Use SQLite backup API
    db.backup(backupPath)
        .then(() => {
        console.log(`[DB] Backup completed successfully`);
    })
        .catch((error) => {
        console.error(`[DB] Backup failed:`, error);
        throw error;
    });
    return backupPath;
}
/**
 * Vacuum database (optimize and reclaim space)
 */
function vacuumDatabase() {
    console.log('[DB] Vacuuming database...');
    const db = getDb();
    db.exec('VACUUM');
    console.log('[DB] Database vacuumed successfully');
}
/**
 * Get database statistics
 */
function getDatabaseStats() {
    const db = getDb();
    const dbPath = getDbPath();
    const stats = fs_1.default.statSync(dbPath);
    // Get all tables
    const tables = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
    // Get row count for each table
    const tableStats = tables.map(table => {
        const result = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
        return {
            name: table.name,
            rowCount: result.count
        };
    });
    // Get page info
    const pageSize = db.pragma('page_size', { simple: true });
    const pageCount = db.pragma('page_count', { simple: true });
    return {
        tables: tableStats,
        totalSize: stats.size,
        pageSize,
        pageCount
    };
}
