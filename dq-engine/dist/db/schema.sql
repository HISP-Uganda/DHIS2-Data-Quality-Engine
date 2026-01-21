-- IWS Dashboard SQLite Schema
-- This will be executed automatically on first run

-- Configurations table (replaces in-memory configStorage)
CREATE TABLE IF NOT EXISTS configurations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,

    -- Source system
    source_url TEXT NOT NULL,
    source_user TEXT NOT NULL,
    source_pass_encrypted TEXT NOT NULL,
    selected_source_dataset TEXT,
    selected_source_org_units TEXT DEFAULT '[]',
    selected_source_org_names TEXT DEFAULT '[]',
    selected_data_elements TEXT DEFAULT '[]',
    period TEXT,

    -- Destination system
    destination_url TEXT NOT NULL,
    destination_user TEXT NOT NULL,
    destination_pass_encrypted TEXT NOT NULL,
    selected_dest_dataset TEXT,
    selected_dest_org_units TEXT DEFAULT '[]',
    selected_dest_org_names TEXT DEFAULT '[]',
    data_element_mapping TEXT,

    -- Tree data (stored as JSON)
    source_org_unit_tree TEXT,
    destination_org_unit_tree TEXT,

    -- Comparison configuration
    selected_datasets TEXT DEFAULT '[]',
    data_element_groups TEXT DEFAULT '[]',

    -- Metadata
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_run_at TEXT,
    created_by TEXT
);

-- Schedules table (replaces in-memory schedulesStore)
CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    cron TEXT NOT NULL,
    org_unit TEXT,
    period TEXT,
    enabled INTEGER DEFAULT 1,

    -- Configuration
    source_url TEXT,
    source_user TEXT,
    source_pass_encrypted TEXT,
    data_elements TEXT DEFAULT '[]',
    dataset_dc TEXT,

    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_run_at TEXT,
    next_run_at TEXT
);

-- DQ Runs table (replaces in-memory statsStore)
CREATE TABLE IF NOT EXISTS dq_runs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    configuration_id TEXT REFERENCES configurations(id) ON DELETE SET NULL,
    schedule_id TEXT REFERENCES schedules(id) ON DELETE SET NULL,

    -- Run parameters
    org_unit TEXT NOT NULL,
    period TEXT NOT NULL,
    source_data_elements INTEGER DEFAULT 0,
    destination_data_elements INTEGER DEFAULT 0,

    -- Results
    success INTEGER NOT NULL,
    validation_errors INTEGER DEFAULT 0,
    data_conflicts INTEGER DEFAULT 0,
    completeness REAL DEFAULT 0,
    duration_ms INTEGER,

    -- Error details
    error_message TEXT,
    error_stack TEXT,

    -- Metadata
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_dq_runs_config ON dq_runs(configuration_id);
CREATE INDEX IF NOT EXISTS idx_dq_runs_schedule ON dq_runs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_dq_runs_started ON dq_runs(started_at DESC);

-- Comparisons table
CREATE TABLE IF NOT EXISTS comparisons (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    configuration_id TEXT REFERENCES configurations(id) ON DELETE SET NULL,

    -- Comparison parameters
    datasets TEXT DEFAULT '[]',
    org_unit TEXT,
    period TEXT,

    -- Results
    total_records INTEGER DEFAULT 0,
    valid_records INTEGER DEFAULT 0,
    mismatched_records INTEGER DEFAULT 0,
    missing_records INTEGER DEFAULT 0,
    out_of_range_records INTEGER DEFAULT 0,
    consensus_found INTEGER DEFAULT 0,

    -- Detailed results (stored as JSON)
    results TEXT,

    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_comparisons_config ON comparisons(configuration_id);
CREATE INDEX IF NOT EXISTS idx_comparisons_created ON comparisons(created_at DESC);

-- Facilities table (notification management)
CREATE TABLE IF NOT EXISTS facilities (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    dhis2_org_unit_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    level INTEGER,

    -- Contact information
    email TEXT,
    phone TEXT,
    whatsapp TEXT,

    -- Notification preferences
    notify_email INTEGER DEFAULT 0,
    notify_sms INTEGER DEFAULT 0,
    notify_whatsapp INTEGER DEFAULT 0,

    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_facilities_org_unit ON facilities(dhis2_org_unit_id);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

    -- Who, what, when
    user_id TEXT,
    user_email TEXT,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,

    -- Details (stored as JSON)
    changes TEXT,
    ip_address TEXT,
    user_agent TEXT,

    -- Metadata
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- Validation rules table (for advanced validation)
CREATE TABLE IF NOT EXISTS validation_rules (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,

    -- Rule configuration
    rule_type TEXT NOT NULL, -- 'range', 'consistency', 'outlier', 'mandatory'
    data_elements TEXT NOT NULL, -- JSON array
    condition TEXT, -- Expression like "DE1 + DE2 == DE3"
    threshold REAL,
    severity TEXT DEFAULT 'warning', -- 'error', 'warning', 'info'

    -- Rule application
    dataset_id TEXT,
    org_unit_levels TEXT, -- JSON array: which levels to apply to

    -- Metadata
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    created_by TEXT
);

-- Notification queue table
CREATE TABLE IF NOT EXISTS notification_queue (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),

    -- Notification details
    notification_type TEXT NOT NULL, -- 'email', 'sms', 'whatsapp'
    recipient TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,

    -- Related resources
    dq_run_id TEXT REFERENCES dq_runs(id) ON DELETE CASCADE,
    comparison_id TEXT REFERENCES comparisons(id) ON DELETE CASCADE,

    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,

    -- Metadata
    created_at TEXT DEFAULT (datetime('now')),
    sent_at TEXT,
    next_retry_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_status ON notification_queue(status, next_retry_at);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_configurations_updated_at
AFTER UPDATE ON configurations
BEGIN
    UPDATE configurations SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_schedules_updated_at
AFTER UPDATE ON schedules
BEGIN
    UPDATE schedules SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_facilities_updated_at
AFTER UPDATE ON facilities
BEGIN
    UPDATE facilities SET updated_at = datetime('now') WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_validation_rules_updated_at
AFTER UPDATE ON validation_rules
BEGIN
    UPDATE validation_rules SET updated_at = datetime('now') WHERE id = NEW.id;
END;
