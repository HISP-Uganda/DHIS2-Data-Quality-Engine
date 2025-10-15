# IWS Dashboard - Phase 1 Improvements

## What Changed

### 1. **SQLite Database (Replaced In-Memory Storage)**

**Before:**
- Configurations, schedules, and statistics were stored in memory and JSON files
- Data was lost when the server restarted
- No concurrent access protection

**After:**
- All data now stored in SQLite database (`data/iws-dashboard.db`)
- Data persists across restarts
- ACID transactions ensure data integrity
- Easy to backup (just copy the `.db` file)

**Database Tables:**
- `configurations` - Comparison configurations
- `schedules` - Scheduled DQ jobs
- `dq_runs` - History of all DQ runs
- `comparisons` - History of dataset comparisons
- `facilities` - Facility contact information
- `audit_logs` - Audit trail of all actions
- `validation_rules` - Advanced validation rules (future feature)
- `notification_queue` - Notification queue (future feature)

### 2. **Credential Encryption**

**Before:**
- Passwords stored in plain text in JSON files
- Major security risk

**After:**
- All passwords encrypted using AES-256-GCM
- Encryption key stored in `.env` file (ENCRYPTION_KEY)
- Passwords automatically encrypted when saving configurations
- Automatically decrypted when loading configurations

### 3. **Health Check Endpoint**

**New Endpoint:** `GET /api/health`

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-14T10:30:00.000Z",
  "database": {
    "healthy": true,
    "path": "/path/to/iws-dashboard.db",
    "size": 102400,
    "inTransaction": false
  },
  "uptime": 3600,
  "memory": {...}
}
```

### 4. **Graceful Shutdown**

- Database connections properly closed on SIGTERM/SIGINT
- No data corruption on server restart

## How to Use

### Setup

1. **Install dependencies** (already done):
   ```bash
   cd dq-engine
   npm install
   ```

2. **Configure environment**:
   - Copy `.env.example` to `.env` (already done)
   - Update `ENCRYPTION_KEY` with a secure random value (already set)

3. **Database auto-initialization**:
   - Database is automatically created on first run
   - Schema is automatically applied
   - Located at: `dq-engine/data/iws-dashboard.db`

### Running

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

### Database Management

**Backup database:**
```bash
# Manual backup
cp data/iws-dashboard.db data/backup-$(date +%Y%m%d).db
```

**View database contents:**
```bash
# Install sqlite3 command line tool
brew install sqlite3  # macOS
# or
sudo apt install sqlite3  # Linux

# Open database
sqlite3 data/iws-dashboard.db

# Example queries
SELECT * FROM configurations;
SELECT * FROM dq_runs ORDER BY started_at DESC LIMIT 10;
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;
```

**Database statistics:**
```bash
# Get table sizes and row counts
sqlite3 data/iws-dashboard.db ".schema"
sqlite3 data/iws-dashboard.db "SELECT name, COUNT(*) FROM configurations;"
```

### Migration from Old System

**Existing configurations will NOT be automatically migrated.**

If you had configurations in the old JSON file format:
1. They are located in: `dq-engine/data/comparison-configs/configurations.json`
2. You'll need to recreate them through the UI
3. The old file is still there as a reference

**Why no auto-migration?**
- Passwords need to be encrypted
- Schema has been improved
- Better to start fresh with encrypted credentials

## Security Notes

### ENCRYPTION_KEY
- **CRITICAL**: Keep your `ENCRYPTION_KEY` secret
- Never commit `.env` file to git (it's in `.gitignore`)
- If you lose the encryption key, you cannot decrypt saved passwords
- If key is compromised, generate a new one and re-save all configurations

### Backup Strategy

**Recommended:**
1. Backup `data/iws-dashboard.db` regularly
2. Keep backups in secure location
3. Backup contains encrypted passwords (still secure if encryption key is safe)

```bash
# Simple backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp data/iws-dashboard.db backups/iws-dashboard-$DATE.db
echo "Backup created: backups/iws-dashboard-$DATE.db"
```

## Breaking Changes

### API Changes
None - all existing API endpoints work the same way

### Data Storage
- Configurations are now in database, not JSON files
- Old JSON files in `data/comparison-configs/` are no longer used
- You can safely delete `data/comparison-configs/` after verifying everything works

## Troubleshooting

### "Database connection failed"
- Check that `data/` directory exists and is writable
- Check permissions: `chmod 755 data/`
- Check disk space: `df -h`

### "Decryption failed"
- ENCRYPTION_KEY in `.env` doesn't match the one used to encrypt
- Solution: Use the same ENCRYPTION_KEY or re-save configurations

### "Table already exists" error
- This is normal on restart - database schema is applied if it doesn't exist
- Error is silently ignored

### Database is locked
- Another process is accessing the database
- SQLite uses file locking - check no other instances are running
- Close any sqlite3 command line sessions

## Next Steps (Phase 2)

Coming soon:
- Job queue system with Bull/BullMQ
- Advanced validation rules engine
- Real-time progress updates with WebSockets
- Audit logging with user tracking
- Enhanced error messages
- Dry-run mode for testing configurations

## File Structure

```
dq-engine/
├── data/                       # Data directory (auto-created)
│   └── iws-dashboard.db       # SQLite database
├── src/
│   ├── db/
│   │   ├── connection.ts      # Database connection & utilities
│   │   └── schema.sql         # Database schema
│   ├── utils/
│   │   └── encryption.ts      # Encryption utilities
│   ├── configStorage.ts       # Database-backed configuration storage
│   ├── index.ts               # Main API server
│   └── ...
├── .env                       # Environment variables (not in git)
├── .env.example              # Template for .env
└── UPGRADE_NOTES.md          # This file
```

## Questions?

Check the main [CLAUDE.md](../CLAUDE.md) for architecture overview.
