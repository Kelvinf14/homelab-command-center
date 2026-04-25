import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

declare global {
  // eslint-disable-next-line no-var
  var __homelabDb: Database.Database | undefined;
}

function resolveDatabasePath() {
  return process.env.DATABASE_PATH || path.join(process.cwd(), ".data", "app.db");
}

export function getDb() {
  if (global.__homelabDb) return global.__homelabDb;

  const databasePath = resolveDatabasePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  global.__homelabDb = db;
  migrate(db);
  seed(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS container_preferences (
      container_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      monitored INTEGER NOT NULL DEFAULT 1,
      ignored INTEGER NOT NULL DEFAULT 0,
      critical INTEGER NOT NULL DEFAULT 0,
      optional INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS uptime_checks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'GET',
      interval_seconds INTEGER NOT NULL DEFAULT 60,
      critical INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS uptime_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_id TEXT NOT NULL,
      ok INTEGER NOT NULL,
      status_code INTEGER,
      latency_ms INTEGER,
      error TEXT,
      checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(check_id) REFERENCES uptime_checks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alert_rules (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      muted INTEGER NOT NULL DEFAULT 0,
      threshold REAL,
      severity TEXT NOT NULL DEFAULT 'warning',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_id TEXT NOT NULL,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      muted INTEGER NOT NULL DEFAULT 0,
      ignored INTEGER NOT NULL DEFAULT 0,
      first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    );
  `);
}

function seed(db: Database.Database) {
  const set = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  set.run("appName", "HomeLab Command Center");
  set.run("serverName", "Unraid HomeLab");
  set.run("accent", "teal");

  const rule = db.prepare(`
    INSERT OR IGNORE INTO alert_rules (key, label, threshold, severity)
    VALUES (@key, @label, @threshold, @severity)
  `);

  [
    { key: "docker_container_down", label: "Monitored container is not running", threshold: null, severity: "warning" },
    { key: "docker_health_unhealthy", label: "Container healthcheck is unhealthy", threshold: null, severity: "warning" },
    { key: "uptime_check_down", label: "Uptime check is offline", threshold: null, severity: "warning" },
    { key: "speed_download_low", label: "Download speed below threshold", threshold: 100, severity: "warning" },
    { key: "server_disk_high", label: "Disk usage above threshold", threshold: 85, severity: "warning" }
  ].forEach((item) => rule.run(item));
}
