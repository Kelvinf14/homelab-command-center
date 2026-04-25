import { clamp } from "@/lib/utils";
import { getAlertRules, syncAlerts, type AlertRow } from "@/lib/db/repository";
import type { DockerContainer, UptimeStatus } from "@/lib/providers/types";

type GeneratedAlert = Omit<AlertRow, "first_seen" | "last_seen" | "resolved_at" | "status">;

function ruleMap() {
  return new Map(getAlertRules().map((rule) => [rule.key, rule]));
}

function severityFor(ruleSeverity: string, explicitCritical: boolean) {
  if (explicitCritical) return "critical";
  return ruleSeverity === "critical" ? "warning" : (ruleSeverity as "info" | "warning" | "critical");
}

export function evaluateAlerts(input: {
  containers: DockerContainer[];
  uptimeChecks: UptimeStatus[];
  serverDisk: number;
  speedDownload: number;
}) {
  const rules = ruleMap();
  const alerts: GeneratedAlert[] = [];

  const push = (alert: GeneratedAlert, ruleKey: string) => {
    const rule = rules.get(ruleKey);
    if (!rule || !rule.enabled) return;
    alerts.push({
      ...alert,
      severity: severityFor(rule.severity, alert.severity === "critical"),
      muted: rule.muted || alert.muted ? 1 : 0
    });
  };

  input.containers.forEach((container) => {
    if (container.preference === "ignored") return;
    const explicitCritical = container.preference === "critical";
    const sourceId = container.id.slice(0, 12);
    if (container.state !== "running" && container.preference !== "optional") {
      push(
        {
          id: `docker:${sourceId}:down`,
          source: "docker",
          source_id: container.id,
          type: "docker_container_down",
          severity: explicitCritical ? "critical" : "warning",
          title: `${container.name} is ${container.state}`,
          message: `${container.name} is marked ${container.preference} and is currently ${container.state}.`,
          muted: 0,
          ignored: 0
        },
        "docker_container_down"
      );
    }
    if (container.health === "unhealthy") {
      push(
        {
          id: `docker:${sourceId}:unhealthy`,
          source: "docker",
          source_id: container.id,
          type: "docker_health_unhealthy",
          severity: explicitCritical ? "critical" : "warning",
          title: `${container.name} healthcheck failed`,
          message: "Docker reports this container healthcheck as unhealthy.",
          muted: 0,
          ignored: 0
        },
        "docker_health_unhealthy"
      );
    }
  });

  input.uptimeChecks.forEach((check) => {
    if (!check.enabled || check.ok !== false) return;
    push(
      {
        id: `uptime:${check.id}:down`,
        source: "uptime",
        source_id: check.id,
        type: "uptime_check_down",
        severity: check.critical ? "critical" : "warning",
        title: `${check.name} is offline`,
        message: `${check.url} failed its latest uptime check.`,
        muted: 0,
        ignored: 0
      },
      "uptime_check_down"
    );
  });

  const diskRule = rules.get("server_disk_high");
  if (diskRule?.enabled && diskRule.threshold !== null && input.serverDisk >= diskRule.threshold) {
    push(
      {
        id: "server:disk:high",
        source: "server",
        source_id: "disk",
        type: "server_disk_high",
        severity: "warning",
        title: "Disk usage is high",
        message: `Disk usage is ${input.serverDisk}%, above the configured ${diskRule.threshold}% threshold.`,
        muted: 0,
        ignored: 0
      },
      "server_disk_high"
    );
  }

  const speedRule = rules.get("speed_download_low");
  if (speedRule?.enabled && speedRule.threshold !== null && input.speedDownload < speedRule.threshold) {
    push(
      {
        id: "speedtest:download:low",
        source: "speedtest",
        source_id: "download",
        type: "speed_download_low",
        severity: "warning",
        title: "Download speed is below target",
        message: `Latest download speed is ${input.speedDownload} Mbps, below ${speedRule.threshold} Mbps.`,
        muted: 0,
        ignored: 0
      },
      "speed_download_low"
    );
  }

  syncAlerts(alerts);
  return alerts;
}

export function calculateHealthScore(alerts: Pick<AlertRow, "severity" | "ignored" | "muted" | "status">[]) {
  const active = alerts.filter((alert) => alert.status === "active" && !alert.ignored);
  const penalty = active.reduce((sum, alert) => {
    if (alert.muted) return sum + 2;
    if (alert.severity === "critical") return sum + 22;
    if (alert.severity === "warning") return sum + 9;
    return sum + 3;
  }, 0);
  return clamp(100 - penalty, 0, 100);
}
