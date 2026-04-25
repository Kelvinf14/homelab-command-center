export type ProviderHealth = {
  configured: boolean;
  ok: boolean;
  message: string;
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
  ok: boolean | null;
  latencyMs: number | null;
  uptimePercent: number;
  statusCode: number | null;
  checkedAt: string | null;
  timeline: boolean[];
};
