export type ProviderHealth = {
  configured: boolean;
  ok: boolean;
  status: "connected" | "not_configured" | "unavailable" | "error";
  message: string;
  error?: string;
};

export interface Provider<TStatus, THistory = unknown> {
  key: string;
  name: string;
  healthCheck(): Promise<ProviderHealth>;
  fetchCurrentStatus(): Promise<TStatus>;
  fetchHistory(): Promise<THistory>;
  normalizeData(input: unknown): TStatus;
}

export type DockerContainer = {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  uptimeSeconds: number;
  ports: string[];
  networkMode: string;
  labels: Record<string, string>;
  cpuPercent: number | null;
  memoryUsage: number | null;
  memoryLimit: number | null;
  restartCount: number;
  health: "healthy" | "unhealthy" | "starting" | "none";
  preference: "monitored" | "ignored" | "critical" | "optional";
};

export type UptimeStatus = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  critical: boolean;
  expectedStatusCode: number;
  timeoutSeconds: number;
  ok: boolean | null;
  latencyMs: number | null;
  uptimePercent: number;
  statusCode: number | null;
  lastError: string | null;
  checkedAt: string | null;
  timeline: boolean[];
};

export type ProviderKey =
  | "radarr"
  | "sonarr"
  | "prowlarr"
  | "sabnzbd"
  | "transmission"
  | "plex"
  | "uptime-kuma"
  | "speedtest"
  | "beszel"
  | "tracearr";

export type IntegrationStatus = "connected" | "not_configured" | "unavailable" | "warning";

export type MediaAppStatus = {
  id: string;
  provider: ProviderKey;
  name: string;
  status: IntegrationStatus;
  message: string;
  version?: string;
  healthIssues: string[];
  queueCount: number;
  missingCount: number;
};

export type MediaQueueItem = {
  source: string;
  title: string;
  status: string;
  size?: string;
};

export type MediaPipelineStatus = {
  configured: boolean;
  apps: MediaAppStatus[];
  queue: MediaQueueItem[];
  downloads: {
    source: string;
    downloadSpeed?: string;
    uploadSpeed?: string;
    queueCount?: number;
    pausedCount?: number;
    errorCount?: number;
  }[];
  issues: { source: string; message: string; severity: "warning" | "critical" }[];
  missing: { source: string; count: number; label: string }[];
  recent: { source: string; title: string; when?: string }[];
};

export type SpeedtestStatus = {
  configured: boolean;
  status: "not_configured" | "connected" | "unavailable";
  message: string;
  latest: null | {
    download: number | null;
    upload: number | null;
    ping: number | null;
    jitter: number | null;
    isp?: string | null;
    at?: string | null;
  };
  history: { time: string; download?: number | null; upload?: number | null; ping?: number | null }[];
};

export type ServerMetricsStatus = {
  configured: boolean;
  status: "not_configured" | "connected" | "unavailable";
  message: string;
  metrics: null | {
    cpuPercent?: number | null;
    memoryPercent?: number | null;
    diskPercent?: number | null;
    uptime?: string | null;
    networkIn?: number | null;
    networkOut?: number | null;
  };
  history: { time: string; cpu?: number | null; ram?: number | null; disk?: number | null }[];
};
