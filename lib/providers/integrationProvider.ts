import { Buffer } from "node:buffer";
import {
  getEnabledIntegrationConfigs,
  getIntegrationConfigs,
  updateIntegrationConnectionResult,
  type IntegrationConfig
} from "@/lib/db/repository";
import type {
  MediaAppStatus,
  MediaPipelineStatus,
  MediaQueueItem,
  Provider,
  ProviderHealth,
  ProviderKey,
  ServerMetricsStatus,
  SpeedtestStatus
} from "@/lib/providers/types";

const mediaProviders: ProviderKey[] = ["radarr", "sonarr", "prowlarr", "sabnzbd", "transmission", "plex"];

function normalizeBaseUrl(baseUrl: string | null) {
  return (baseUrl || "").trim().replace(/\/+$/, "");
}

function buildUrl(config: IntegrationConfig, path: string, query?: Record<string, string | number | undefined>) {
  const baseUrl = normalizeBaseUrl(config.base_url);
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutSeconds = 10) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutSeconds * 1000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 240)}`);
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

async function fetchText(url: string, init: RequestInit = {}, timeoutSeconds = 10) {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutSeconds * 1000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 240)}`);
  return text;
}

async function arrGet<T>(config: IntegrationConfig, path: string, version: "v1" | "v3" = "v3", query?: Record<string, string | number>) {
  const prefix = `/api/${version}`;
  return fetchJson<T>(buildUrl(config, `${prefix}${path}`, { ...query, apikey: config.api_key || undefined }), {
    headers: {
      "X-Api-Key": config.api_key || ""
    }
  });
}

function recordsFrom(value: unknown) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as { records?: unknown[] }).records)) {
    return (value as { records: unknown[] }).records;
  }
  return [];
}

function totalFrom(value: unknown) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    const candidate = value as { totalRecords?: number; total?: number; count?: number; records?: unknown[] };
    return candidate.totalRecords ?? candidate.total ?? candidate.count ?? candidate.records?.length ?? 0;
  }
  return 0;
}

function itemTitle(item: unknown) {
  if (!item || typeof item !== "object") return "Unknown item";
  const value = item as Record<string, any>;
  return (
    value.title ||
    value.movie?.title ||
    value.series?.title ||
    value.episode?.title ||
    value.name ||
    value.filename ||
    "Unknown item"
  );
}

function formatBytesPerSecond(value: unknown) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B/s";
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

async function fetchArrApp(config: IntegrationConfig, provider: "radarr" | "sonarr" | "prowlarr"): Promise<{
  app: MediaAppStatus;
  queue: MediaQueueItem[];
  downloads: MediaPipelineStatus["downloads"];
  issues: MediaPipelineStatus["issues"];
  missing: MediaPipelineStatus["missing"];
  recent: MediaPipelineStatus["recent"];
}> {
  const version = provider === "prowlarr" ? "v1" : "v3";
  const [status, health, queue, missing, history, indexerStatus] = await Promise.allSettled([
    arrGet<Record<string, any>>(config, "/system/status", version),
    arrGet<unknown[]>(config, "/health", version),
    arrGet<unknown>(config, "/queue", version, { page: 1, pageSize: 50 }),
    provider === "prowlarr" ? Promise.resolve(null) : arrGet<unknown>(config, "/wanted/missing", version, { page: 1, pageSize: 50 }),
    provider === "prowlarr"
      ? Promise.resolve(null)
      : arrGet<unknown>(config, "/history", version, { page: 1, pageSize: 10, sortKey: "date", sortDirection: "descending" }),
    provider === "prowlarr" ? arrGet<unknown>(config, "/indexerstatus", version) : Promise.resolve(null)
  ]);

  const healthItems = health.status === "fulfilled" && Array.isArray(health.value) ? health.value : [];
  const queueValue = queue.status === "fulfilled" ? queue.value : null;
  const missingValue = missing.status === "fulfilled" ? missing.value : null;
  const historyValue = history.status === "fulfilled" ? history.value : null;
  const indexerValue = indexerStatus.status === "fulfilled" ? indexerStatus.value : null;
  const healthIssues = healthItems.map((item) => itemTitle(item));
  const queueRecords = recordsFrom(queueValue);
  const missingCount = totalFrom(missingValue);
  const versionText = status.status === "fulfilled" ? String(status.value.version || status.value.appVersion || "") : undefined;
  const indexerIssueCount = totalFrom(indexerValue);

  const appStatus: MediaAppStatus = {
    id: config.id,
    provider,
    name: config.display_name,
    status: healthIssues.length || indexerIssueCount ? "warning" : "connected",
    message: healthIssues.length ? `${healthIssues.length} health issue(s)` : "Connected",
    version: versionText,
    healthIssues,
    queueCount: totalFrom(queueValue),
    missingCount
  };

  return {
    app: appStatus,
    queue: queueRecords.slice(0, 12).map((item) => ({
      source: config.display_name,
      title: itemTitle(item),
      status: String((item as Record<string, any>)?.status || (item as Record<string, any>)?.trackedDownloadStatus || "queued")
    })),
    downloads: [],
    issues: healthIssues.map((message) => ({ source: config.display_name, message, severity: "warning" as const })),
    missing: missingCount ? [{ source: config.display_name, count: missingCount, label: provider === "radarr" ? "Missing movies" : "Missing episodes" }] : [],
    recent: recordsFrom(historyValue)
      .slice(0, 8)
      .map((item) => ({ source: config.display_name, title: itemTitle(item), when: String((item as Record<string, any>)?.date || "") }))
  };
}

async function fetchSabnzbd(config: IntegrationConfig): Promise<{
  app: MediaAppStatus;
  queue: MediaQueueItem[];
  downloads: MediaPipelineStatus["downloads"];
  issues: MediaPipelineStatus["issues"];
  recent: MediaPipelineStatus["recent"];
}> {
  const [queueResult, historyResult] = await Promise.allSettled([
    fetchJson<Record<string, any>>(buildUrl(config, "/api", { mode: "queue", output: "json", apikey: config.api_key || undefined })),
    fetchJson<Record<string, any>>(buildUrl(config, "/api", { mode: "history", output: "json", apikey: config.api_key || undefined, limit: 20 }))
  ]);
  const queue = queueResult.status === "fulfilled" ? queueResult.value.queue || {} : {};
  const history = historyResult.status === "fulfilled" ? historyResult.value.history || {} : {};
  const slots = Array.isArray(queue.slots) ? queue.slots : [];
  const failed = Array.isArray(history.slots) ? history.slots.filter((slot: Record<string, any>) => slot.status === "Failed") : [];
  const paused = Boolean(queue.paused);

  return {
    app: {
      id: config.id,
      provider: "sabnzbd",
      name: config.display_name,
      status: failed.length || paused ? "warning" : "connected",
      message: paused ? "Paused" : "Connected",
      healthIssues: failed.map((slot: Record<string, any>) => slot.name || "Failed SABnzbd job"),
      queueCount: slots.length,
      missingCount: 0
    },
    queue: slots.slice(0, 12).map((slot: Record<string, any>) => ({
      source: config.display_name,
      title: slot.filename || slot.name || "Queued download",
      status: slot.status || "queued",
      size: slot.mb || slot.size
    })),
    downloads: [
      {
        source: config.display_name,
        downloadSpeed: String(queue.speed || "0 B/s"),
        queueCount: slots.length,
        pausedCount: paused ? 1 : 0,
        errorCount: failed.length
      }
    ],
    issues: failed.map((slot: Record<string, any>) => ({
      source: config.display_name,
      message: slot.name || "Failed SABnzbd job",
      severity: "warning" as const
    })),
    recent: Array.isArray(history.slots)
      ? history.slots.slice(0, 8).map((slot: Record<string, any>) => ({
          source: config.display_name,
          title: slot.name || slot.filename || "History item",
          when: slot.completed || slot.completed_at || ""
        }))
      : []
  };
}

async function transmissionRpc<T>(config: IntegrationConfig, body: Record<string, any>, sessionId?: string): Promise<{ data: T; sessionId?: string }> {
  const baseUrl = normalizeBaseUrl(config.base_url);
  const endpoint = baseUrl.endsWith("/rpc") ? baseUrl : `${baseUrl}/transmission/rpc`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (sessionId) headers["X-Transmission-Session-Id"] = sessionId;
  if (config.username || config.password) {
    headers.Authorization = `Basic ${Buffer.from(`${config.username || ""}:${config.password || ""}`).toString("base64")}`;
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10000)
  });
  if (response.status === 409) {
    const nextSessionId = response.headers.get("x-transmission-session-id") || undefined;
    if (!nextSessionId) throw new Error("Transmission requested a session id but did not return one");
    return transmissionRpc<T>(config, body, nextSessionId);
  }
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${text.slice(0, 240)}`);
  return { data: JSON.parse(text) as T, sessionId };
}

async function fetchTransmission(config: IntegrationConfig): Promise<{
  app: MediaAppStatus;
  queue: MediaQueueItem[];
  downloads: MediaPipelineStatus["downloads"];
  issues: MediaPipelineStatus["issues"];
}> {
  const response = await transmissionRpc<Record<string, any>>(config, {
    method: "torrent-get",
    arguments: {
      fields: ["id", "name", "status", "rateDownload", "rateUpload", "error", "errorString"]
    }
  });
  const torrents = response.data.arguments?.torrents || [];
  const active = torrents.filter((torrent: Record<string, any>) => torrent.rateDownload > 0 || torrent.rateUpload > 0);
  const paused = torrents.filter((torrent: Record<string, any>) => torrent.status === 0);
  const errors = torrents.filter((torrent: Record<string, any>) => torrent.error || torrent.errorString);
  const downloadRate = torrents.reduce((sum: number, torrent: Record<string, any>) => sum + Number(torrent.rateDownload || 0), 0);
  const uploadRate = torrents.reduce((sum: number, torrent: Record<string, any>) => sum + Number(torrent.rateUpload || 0), 0);

  return {
    app: {
      id: config.id,
      provider: "transmission",
      name: config.display_name,
      status: errors.length ? "warning" : "connected",
      message: `${active.length} active torrent(s)`,
      healthIssues: errors.map((torrent: Record<string, any>) => torrent.errorString || torrent.name),
      queueCount: torrents.length,
      missingCount: 0
    },
    queue: torrents.slice(0, 12).map((torrent: Record<string, any>) => ({
      source: config.display_name,
      title: torrent.name || "Torrent",
      status: torrent.errorString || (torrent.status === 0 ? "paused" : "active")
    })),
    downloads: [
      {
        source: config.display_name,
        downloadSpeed: formatBytesPerSecond(downloadRate),
        uploadSpeed: formatBytesPerSecond(uploadRate),
        queueCount: torrents.length,
        pausedCount: paused.length,
        errorCount: errors.length
      }
    ],
    issues: errors.map((torrent: Record<string, any>) => ({
      source: config.display_name,
      message: torrent.errorString || torrent.name || "Transmission torrent error",
      severity: "warning" as const
    }))
  };
}

function xmlAttr(text: string, name: string) {
  const match = text.match(new RegExp(`${name}="([^"]*)"`));
  return match?.[1];
}

async function fetchPlex(config: IntegrationConfig): Promise<{
  app: MediaAppStatus;
  downloads: MediaPipelineStatus["downloads"];
  recent: MediaPipelineStatus["recent"];
}> {
  const token = config.token || config.api_key || "";
  const [identity, sessions, recent] = await Promise.allSettled([
    fetchText(buildUrl(config, "/identity", { "X-Plex-Token": token })),
    fetchText(buildUrl(config, "/status/sessions", { "X-Plex-Token": token })),
    fetchText(buildUrl(config, "/library/recentlyAdded", { "X-Plex-Token": token, "X-Plex-Container-Size": 8 }))
  ]);
  const identityText = identity.status === "fulfilled" ? identity.value : "";
  const sessionsText = sessions.status === "fulfilled" ? sessions.value : "";
  const recentText = recent.status === "fulfilled" ? recent.value : "";
  const sessionCount = Number(xmlAttr(sessionsText, "size") || 0);
  const serverName = xmlAttr(identityText, "machineIdentifier") ? "Connected" : "Connected";
  const titles = [...recentText.matchAll(/title="([^"]*)"/g)].slice(0, 8).map((match) => match[1]);

  return {
    app: {
      id: config.id,
      provider: "plex",
      name: config.display_name,
      status: "connected",
      message: `${sessionCount} active stream(s)`,
      healthIssues: [],
      queueCount: sessionCount,
      missingCount: 0
    },
    downloads: [{ source: config.display_name, queueCount: sessionCount }],
    recent: titles.map((title) => ({ source: config.display_name, title, when: serverName }))
  };
}

async function runMediaConfig(config: IntegrationConfig) {
  try {
    if (config.provider === "radarr" || config.provider === "sonarr" || config.provider === "prowlarr") {
      const result = await fetchArrApp(config, config.provider);
      updateIntegrationConnectionResult(config.id, result.app.status, result.app.message);
      return result;
    }
    if (config.provider === "sabnzbd") {
      const result = await fetchSabnzbd(config);
      updateIntegrationConnectionResult(config.id, result.app.status, result.app.message);
      return { ...result, missing: [] };
    }
    if (config.provider === "transmission") {
      const result = await fetchTransmission(config);
      updateIntegrationConnectionResult(config.id, result.app.status, result.app.message);
      return { ...result, missing: [], recent: [] };
    }
    if (config.provider === "plex") {
      const result = await fetchPlex(config);
      updateIntegrationConnectionResult(config.id, result.app.status, result.app.message);
      return { ...result, queue: [], issues: [], missing: [] };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    updateIntegrationConnectionResult(config.id, "unavailable", message);
    return {
      app: {
        id: config.id,
        provider: config.provider,
        name: config.display_name,
        status: "unavailable",
        message,
        healthIssues: [message],
        queueCount: 0,
        missingCount: 0
      } satisfies MediaAppStatus,
      queue: [],
      downloads: [],
      issues: [{ source: config.display_name, message, severity: "warning" as const }],
      missing: [],
      recent: []
    };
  }
  return null;
}

export const mediaPipelineProvider: Provider<MediaPipelineStatus> = {
  key: "media",
  name: "Media integrations",
  async healthCheck(): Promise<ProviderHealth> {
    const configured = getEnabledIntegrationConfigs().filter((config) => mediaProviders.includes(config.provider)).length;
    return configured
      ? { configured: true, ok: true, status: "connected", message: `${configured} media integration(s) enabled` }
      : { configured: false, ok: true, status: "not_configured", message: "No media integrations configured" };
  },
  async fetchCurrentStatus() {
    const configs = getEnabledIntegrationConfigs().filter((config) => mediaProviders.includes(config.provider));
    if (!configs.length) {
      return { configured: false, apps: [], queue: [], downloads: [], issues: [], missing: [], recent: [] };
    }
    const results = (await Promise.all(configs.map(runMediaConfig))).filter(Boolean) as Awaited<ReturnType<typeof runMediaConfig>>[];
    return {
      configured: true,
      apps: results.map((result) => result!.app),
      queue: results.flatMap((result) => result!.queue),
      downloads: results.flatMap((result) => result!.downloads),
      issues: results.flatMap((result) => result!.issues),
      missing: results.flatMap((result) => result!.missing),
      recent: results.flatMap((result) => result!.recent)
    };
  },
  async fetchHistory() {
    return [];
  },
  normalizeData(input) {
    return input as MediaPipelineStatus;
  }
};

async function fetchGenericJson(config: IntegrationConfig, paths: string[]) {
  let lastError = "";
  for (const path of paths) {
    try {
      return await fetchJson<Record<string, any>>(buildUrl(config, path), {
        headers: {
          Authorization: config.token ? `Bearer ${config.token}` : "",
          "X-Api-Key": config.api_key || ""
        }
      });
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Request failed";
    }
  }
  throw new Error(lastError || "No compatible API endpoint responded");
}

export const speedtestProvider: Provider<SpeedtestStatus> = {
  key: "speedtest",
  name: "Speedtest Tracker",
  async healthCheck() {
    const [config] = getEnabledIntegrationConfigs("speedtest");
    if (!config) return { configured: false, ok: true, status: "not_configured", message: "Speedtest provider not configured" };
    try {
      await fetchGenericJson(config, ["/api/speedtest/latest", "/api/results/latest", "/api/speedtests"]);
      return { configured: true, ok: true, status: "connected", message: "Speedtest provider connected" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Speedtest provider unavailable";
      return { configured: true, ok: false, status: "unavailable", message, error: message };
    }
  },
  async fetchCurrentStatus() {
    const [config] = getEnabledIntegrationConfigs("speedtest");
    if (!config) {
      return { configured: false, status: "not_configured", message: "Speedtest provider not configured", latest: null, history: [] };
    }
    try {
      const data = await fetchGenericJson(config, ["/api/speedtest/latest", "/api/results/latest", "/api/speedtests"]);
      const record = Array.isArray(data) ? data[0] : data.data || data.result || data;
      updateIntegrationConnectionResult(config.id, "connected", "Connected");
      return {
        configured: true,
        status: "connected",
        message: "Connected",
        latest: {
          download: Number(record.download || record.download_mbps || record.downloadSpeed) || null,
          upload: Number(record.upload || record.upload_mbps || record.uploadSpeed) || null,
          ping: Number(record.ping || record.latency) || null,
          jitter: Number(record.jitter) || null,
          isp: record.isp || null,
          at: record.created_at || record.createdAt || record.timestamp || null
        },
        history: []
      } satisfies SpeedtestStatus;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Speedtest provider unavailable";
      updateIntegrationConnectionResult(config.id, "unavailable", message);
      return { configured: true, status: "unavailable", message, latest: null, history: [] };
    }
  },
  async fetchHistory() {
    return [];
  },
  normalizeData(input) {
    return input as SpeedtestStatus;
  }
};

export const beszelProvider: Provider<ServerMetricsStatus> = {
  key: "beszel",
  name: "Beszel",
  async healthCheck() {
    const [config] = getEnabledIntegrationConfigs("beszel");
    if (!config) return { configured: false, ok: true, status: "not_configured", message: "Server metrics provider not configured" };
    try {
      await fetchGenericJson(config, ["/api/health", "/api/system", "/api/systems"]);
      return { configured: true, ok: true, status: "connected", message: "Beszel provider connected" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Beszel provider unavailable";
      return { configured: true, ok: false, status: "unavailable", message, error: message };
    }
  },
  async fetchCurrentStatus() {
    const [config] = getEnabledIntegrationConfigs("beszel");
    if (!config) {
      return { configured: false, status: "not_configured", message: "Server metrics provider not configured", metrics: null, history: [] };
    }
    try {
      await fetchGenericJson(config, ["/api/health", "/api/system", "/api/systems"]);
      updateIntegrationConnectionResult(config.id, "connected", "Connected");
      return { configured: true, status: "connected", message: "Connected. Detailed Beszel metric mapping is not configured yet.", metrics: null, history: [] };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Beszel provider unavailable";
      updateIntegrationConnectionResult(config.id, "unavailable", message);
      return { configured: true, status: "unavailable", message, metrics: null, history: [] };
    }
  },
  async fetchHistory() {
    return [];
  },
  normalizeData(input) {
    return input as ServerMetricsStatus;
  }
};

export async function testIntegration(id: string) {
  const config = getIntegrationConfigs().find((item) => item.id === id);
  if (!config) throw new Error("Integration not found");
  if (!config.enabled) throw new Error("Integration is disabled");
  if (!normalizeBaseUrl(config.base_url)) throw new Error("Base URL is required");

  if (mediaProviders.includes(config.provider)) {
    const result = await runMediaConfig(config);
    if (!result) throw new Error("Unsupported media integration");
    return { status: result.app.status, message: result.app.message };
  }

  if (config.provider === "speedtest") {
    const result = await speedtestProvider.fetchCurrentStatus();
    return { status: result.status, message: result.message };
  }

  if (config.provider === "beszel") {
    const result = await beszelProvider.fetchCurrentStatus();
    return { status: result.status, message: result.message };
  }

  try {
    await fetchGenericJson(config, ["/api/health", "/health", "/api/status"]);
    updateIntegrationConnectionResult(config.id, "connected", "Connected");
    return { status: "connected", message: "Connected" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    updateIntegrationConnectionResult(config.id, "unavailable", message);
    return { status: "unavailable", message };
  }
}
