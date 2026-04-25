import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";

export type ContainerPreference = {
  container_id: string;
  name: string;
  monitored: number;
  ignored: number;
  critical: number;
  optional: number;
};

export type UptimeCheck = {
  id: string;
  name: string;
  url: string;
  method: "GET" | "HEAD";
  interval_seconds: number;
  critical: number;
  enabled: number;
};

export type AlertRow = {
  id: string;
  source: string;
  source_id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  status: "active" | "resolved";
  muted: number;
  ignored: number;
  first_seen: string;
  last_seen: string;
  resolved_at: string | null;
};

export type AlertRule = {
  key: string;
  label: string;
  enabled: number;
  muted: number;
  threshold: number | null;
  severity: "info" | "warning" | "critical";
};

export function getSettings() {
  const db = getDb();
  const rows = db.prepare("SELECT key, value FROM settings").all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export function updateSettings(settings: Record<string, string>) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (@key, @value, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);
  const write = db.transaction((items: Record<string, string>) => {
    Object.entries(items).forEach(([key, value]) => stmt.run({ key, value }));
  });
  write(settings);
}

export function getContainerPreferences() {
  return getDb().prepare("SELECT * FROM container_preferences").all() as ContainerPreference[];
}

export function getContainerPreferenceMap() {
  const entries = getContainerPreferences();
  const map = new Map<string, ContainerPreference>();
  entries.forEach((pref) => {
    map.set(pref.container_id, pref);
    map.set(pref.name, pref);
  });
  return map;
}

export function upsertContainerPreference(input: {
  container_id: string;
  name: string;
  monitored: boolean;
  ignored: boolean;
  critical: boolean;
  optional: boolean;
}) {
  getDb()
    .prepare(`
      INSERT INTO container_preferences (container_id, name, monitored, ignored, critical, optional, updated_at)
      VALUES (@container_id, @name, @monitored, @ignored, @critical, @optional, CURRENT_TIMESTAMP)
      ON CONFLICT(container_id) DO UPDATE SET
        name = excluded.name,
        monitored = excluded.monitored,
        ignored = excluded.ignored,
        critical = excluded.critical,
        optional = excluded.optional,
        updated_at = CURRENT_TIMESTAMP
    `)
    .run({
      ...input,
      monitored: input.monitored ? 1 : 0,
      ignored: input.ignored ? 1 : 0,
      critical: input.critical ? 1 : 0,
      optional: input.optional ? 1 : 0
    });
}

export function getUptimeChecks() {
  return getDb().prepare("SELECT * FROM uptime_checks ORDER BY name ASC").all() as UptimeCheck[];
}

export function upsertUptimeCheck(input: Partial<UptimeCheck> & Pick<UptimeCheck, "name" | "url">) {
  const id = input.id || randomUUID();
  getDb()
    .prepare(`
      INSERT INTO uptime_checks (id, name, url, method, interval_seconds, critical, enabled, updated_at)
      VALUES (@id, @name, @url, @method, @interval_seconds, @critical, @enabled, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        url = excluded.url,
        method = excluded.method,
        interval_seconds = excluded.interval_seconds,
        critical = excluded.critical,
        enabled = excluded.enabled,
        updated_at = CURRENT_TIMESTAMP
    `)
    .run({
      id,
      name: input.name,
      url: input.url,
      method: input.method || "GET",
      interval_seconds: input.interval_seconds || 60,
      critical: input.critical ? 1 : 0,
      enabled: input.enabled === 0 ? 0 : 1
    });
  return id;
}

export function deleteUptimeCheck(id: string) {
  getDb().prepare("DELETE FROM uptime_checks WHERE id = ?").run(id);
}

export function insertUptimeResult(input: {
  check_id: string;
  ok: boolean;
  status_code?: number | null;
  latency_ms?: number | null;
  error?: string | null;
}) {
  getDb()
    .prepare(`
      INSERT INTO uptime_results (check_id, ok, status_code, latency_ms, error)
      VALUES (@check_id, @ok, @status_code, @latency_ms, @error)
    `)
    .run({ ...input, ok: input.ok ? 1 : 0 });
}

export function getLatestUptimeResults() {
  return getDb()
    .prepare(`
      SELECT r.*
      FROM uptime_results r
      INNER JOIN (
        SELECT check_id, MAX(id) AS max_id
        FROM uptime_results
        GROUP BY check_id
      ) latest ON latest.max_id = r.id
    `)
    .all() as {
      check_id: string;
      ok: number;
      status_code: number | null;
      latency_ms: number | null;
      error: string | null;
      checked_at: string;
    }[];
}

export function getUptimeHistory(limit = 240) {
  return getDb()
    .prepare("SELECT * FROM uptime_results ORDER BY checked_at DESC LIMIT ?")
    .all(limit) as {
    check_id: string;
    ok: number;
    status_code: number | null;
    latency_ms: number | null;
    error: string | null;
    checked_at: string;
  }[];
}

export function getAlertRules() {
  return getDb().prepare("SELECT * FROM alert_rules ORDER BY key ASC").all() as AlertRule[];
}

export function updateAlertRule(input: Pick<AlertRule, "key"> & Partial<AlertRule>) {
  getDb()
    .prepare(`
      UPDATE alert_rules
      SET enabled = COALESCE(@enabled, enabled),
          muted = COALESCE(@muted, muted),
          threshold = @threshold,
          severity = COALESCE(@severity, severity),
          updated_at = CURRENT_TIMESTAMP
      WHERE key = @key
    `)
    .run({
      key: input.key,
      enabled: input.enabled ?? null,
      muted: input.muted ?? null,
      threshold: input.threshold ?? null,
      severity: input.severity ?? null
    });
}

export function syncAlerts(alerts: Omit<AlertRow, "first_seen" | "last_seen" | "resolved_at" | "status">[]) {
  const db = getDb();
  const activeIds = alerts.map((alert) => alert.id);
  const upsert = db.prepare(`
    INSERT INTO alerts (id, source, source_id, type, severity, title, message, status, muted, ignored, last_seen)
    VALUES (@id, @source, @source_id, @type, @severity, @title, @message, 'active', @muted, @ignored, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      severity = excluded.severity,
      title = excluded.title,
      message = excluded.message,
      status = CASE WHEN alerts.status = 'resolved' THEN alerts.status ELSE 'active' END,
      muted = CASE WHEN alerts.muted = 1 THEN alerts.muted ELSE excluded.muted END,
      ignored = CASE WHEN alerts.ignored = 1 THEN alerts.ignored ELSE excluded.ignored END,
      last_seen = CURRENT_TIMESTAMP,
      resolved_at = CASE WHEN alerts.status = 'resolved' THEN alerts.resolved_at ELSE NULL END
  `);
  const resolveStale = db.prepare(`
    UPDATE alerts
    SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP
    WHERE status = 'active' AND id NOT IN (${activeIds.map(() => "?").join(",") || "''"})
  `);

  const write = db.transaction(() => {
    alerts.forEach((alert) => upsert.run(alert));
    resolveStale.run(...activeIds);
  });
  write();
}

export function getAlerts(status?: "active" | "resolved") {
  const sql = status
    ? "SELECT * FROM alerts WHERE status = ? ORDER BY ignored ASC, muted ASC, severity DESC, last_seen DESC"
    : "SELECT * FROM alerts ORDER BY last_seen DESC";
  return (status ? getDb().prepare(sql).all(status) : getDb().prepare(sql).all()) as AlertRow[];
}

export function setAlertDisposition(id: string, disposition: "muted" | "ignored" | "resolved", enabled: boolean) {
  const db = getDb();
  if (disposition === "resolved") {
    db.prepare("UPDATE alerts SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    return;
  }
  db.prepare(`UPDATE alerts SET ${disposition} = ? WHERE id = ?`).run(enabled ? 1 : 0, id);
}
