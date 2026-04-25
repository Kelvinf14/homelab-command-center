import http from "node:http";
import { boolFromEnv, formatDuration } from "@/lib/utils";
import { getContainerPreferenceMap } from "@/lib/db/repository";
import type { DockerContainer, Provider } from "@/lib/providers/types";

const dockerSocket = "/var/run/docker.sock";

type DockerListItem = {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Ports?: { IP?: string; PrivatePort: number; PublicPort?: number; Type: string }[];
};

type DockerInspect = {
  Id: string;
  Name: string;
  Created: string;
  RestartCount: number;
  State: {
    Status: string;
    StartedAt: string;
    Health?: { Status: "healthy" | "unhealthy" | "starting" };
  };
};

type DockerStats = {
  memory_stats?: { usage?: number; limit?: number };
  cpu_stats?: { cpu_usage?: { total_usage?: number }; system_cpu_usage?: number; online_cpus?: number };
  precpu_stats?: { cpu_usage?: { total_usage?: number }; system_cpu_usage?: number };
};

async function dockerApi<T>(path: string, method = "GET") {
  return new Promise<T>((resolve, reject) => {
    const req = http.request({ socketPath: dockerSocket, path, method }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Docker API ${res.statusCode}: ${body}`));
          return;
        }
        resolve(body ? (JSON.parse(body) as T) : ({} as T));
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function calculateCpu(stats: DockerStats) {
  const cpuDelta =
    (stats.cpu_stats?.cpu_usage?.total_usage || 0) - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
  const systemDelta = (stats.cpu_stats?.system_cpu_usage || 0) - (stats.precpu_stats?.system_cpu_usage || 0);
  const cpus = stats.cpu_stats?.online_cpus || 1;
  if (cpuDelta <= 0 || systemDelta <= 0) return null;
  return Number(((cpuDelta / systemDelta) * cpus * 100).toFixed(2));
}

function mapPorts(ports?: DockerListItem["Ports"]) {
  if (!ports?.length) return [];
  return ports.map((port) =>
    port.PublicPort ? `${port.PublicPort}:${port.PrivatePort}/${port.Type}` : `${port.PrivatePort}/${port.Type}`
  );
}

function preferenceFor(id: string, name: string) {
  const preferences = getContainerPreferenceMap();
  const pref = preferences.get(id) || preferences.get(name);
  if (!pref) return "optional";
  if (pref.ignored) return "ignored";
  if (pref.critical) return "critical";
  if (pref.monitored) return "monitored";
  return "optional";
}

export const dockerProvider: Provider<{ containers: DockerContainer[] }> = {
  key: "docker",
  name: "Docker",
  async healthCheck() {
    try {
      await dockerApi<{ Version: string }>("/version");
      return { configured: true, ok: true, message: "Docker socket reachable" };
    } catch (error) {
      return {
        configured: false,
        ok: false,
        message: error instanceof Error ? error.message : "Docker socket unavailable"
      };
    }
  },
  async fetchCurrentStatus() {
    const containers = await dockerApi<DockerListItem[]>("/containers/json?all=true");
    const details = await Promise.all(
      containers.map(async (container) => {
        const name = container.Names[0]?.replace(/^\//, "") || container.Id.slice(0, 12);
        let inspect: DockerInspect | null = null;
        let stats: DockerStats | null = null;
        try {
          inspect = await dockerApi<DockerInspect>(`/containers/${container.Id}/json`);
        } catch {
          inspect = null;
        }
        if (container.State === "running") {
          try {
            stats = await dockerApi<DockerStats>(`/containers/${container.Id}/stats?stream=false`);
          } catch {
            stats = null;
          }
        }

        const started = inspect?.State.StartedAt ? new Date(inspect.State.StartedAt).getTime() : 0;
        const uptimeSeconds = started > 0 ? Math.floor((Date.now() - started) / 1000) : 0;
        const health = inspect?.State.Health?.Status || "none";

        return {
          id: container.Id,
          name,
          image: container.Image,
          status: container.Status || formatDuration(uptimeSeconds),
          state: container.State,
          uptimeSeconds,
          ports: mapPorts(container.Ports),
          cpuPercent: stats ? calculateCpu(stats) : null,
          memoryUsage: stats?.memory_stats?.usage ?? null,
          memoryLimit: stats?.memory_stats?.limit ?? null,
          restartCount: inspect?.RestartCount || 0,
          health,
          preference: preferenceFor(container.Id, name)
        } satisfies DockerContainer;
      })
    );
    return { containers: details.sort((a, b) => a.name.localeCompare(b.name)) };
  },
  async fetchHistory() {
    return [];
  },
  normalizeData(input) {
    return input as { containers: DockerContainer[] };
  }
};

export async function restartContainer(id: string) {
  if (!boolFromEnv(process.env.ENABLE_ACTIONS)) {
    throw new Error("Container actions are disabled. Set ENABLE_ACTIONS=true to enable restarts.");
  }
  await dockerApi(`/containers/${id}/restart`, "POST");
}
