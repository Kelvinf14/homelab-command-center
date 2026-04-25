"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import type { AlertRule, UptimeCheck } from "@/lib/db/repository";
import type { DockerContainer } from "@/lib/providers/types";

type SettingsClientProps = {
  settings: Record<string, string>;
  containers: DockerContainer[];
  alertRules: AlertRule[];
  uptimeChecks: UptimeCheck[];
  providerStatus: Record<string, { configured: boolean; message: string }>;
  enableActions: boolean;
};

const secretProviders = [
  "BESZEL_API_URL",
  "BESZEL_API_KEY",
  "UPTIME_KUMA_API_URL",
  "UPTIME_KUMA_API_KEY",
  "SPEEDTEST_TRACKER_API_URL",
  "SPEEDTEST_TRACKER_API_KEY",
  "TRACEARR_API_URL",
  "TRACEARR_API_KEY",
  "RADARR_API_URL",
  "RADARR_API_KEY",
  "RADARR_4K_API_URL",
  "RADARR_4K_API_KEY",
  "SONARR_API_URL",
  "SONARR_API_KEY",
  "PROWLARR_API_URL",
  "PROWLARR_API_KEY",
  "SABNZBD_API_URL",
  "SABNZBD_API_KEY",
  "TRANSMISSION_API_URL",
  "TRANSMISSION_USERNAME",
  "TRANSMISSION_PASSWORD",
  "PLEX_API_URL",
  "PLEX_TOKEN"
];

export function SettingsClient({
  settings,
  containers,
  alertRules,
  uptimeChecks,
  providerStatus,
  enableActions
}: SettingsClientProps) {
  const router = useRouter();
  const [appName, setAppName] = useState(settings.appName || "");
  const [serverName, setServerName] = useState(settings.serverName || "");
  const [accent, setAccent] = useState(settings.accent || "teal");
  const [newCheck, setNewCheck] = useState({ name: "", url: "", method: "GET", interval_seconds: 60, critical: false, enabled: true });

  async function post(type: string, payload: unknown) {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload })
    });
    router.refresh();
  }

  async function saveSettings() {
    await post("settings", { appName, serverName, accent });
  }

  async function saveContainer(container: DockerContainer, value: string) {
    await post("containerPreference", {
      container_id: container.id,
      name: container.name,
      monitored: value === "monitored" || value === "critical",
      ignored: value === "ignored",
      critical: value === "critical",
      optional: value === "optional"
    });
  }

  async function saveRule(rule: AlertRule, patch: Partial<AlertRule>) {
    await post("alertRule", {
      key: rule.key,
      enabled: Boolean(patch.enabled ?? rule.enabled),
      muted: Boolean(patch.muted ?? rule.muted),
      threshold: patch.threshold === undefined ? rule.threshold : patch.threshold,
      severity: patch.severity || rule.severity
    });
  }

  async function addCheck() {
    await post("uptimeCheck", newCheck);
    setNewCheck({ name: "", url: "", method: "GET", interval_seconds: 60, critical: false, enabled: true });
  }

  async function deleteCheck(id: string) {
    await fetch(`/api/uptime/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-muted-foreground">App name</span>
            <Input value={appName} onChange={(event) => setAppName(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted-foreground">Server name</span>
            <Input value={serverName} onChange={(event) => setServerName(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-muted-foreground">Theme accent</span>
            <Select value={accent} onChange={(event) => setAccent(event.target.value)}>
              <option value="teal">Teal</option>
              <option value="sky">Sky</option>
              <option value="emerald">Emerald</option>
              <option value="amber">Amber</option>
            </Select>
          </label>
          <div className="md:col-span-4">
            <Button onClick={saveSettings}>
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Runtime Safety</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <StatusBadge status={enableActions ? "actions enabled" : "actions disabled"} />
          <span className="text-sm text-muted-foreground">Docker restart/control buttons require ENABLE_ACTIONS=true.</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monitored Containers</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {containers.map((container) => (
            <div key={container.id} className="rounded-lg border border-border/60 p-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{container.name}</div>
                  <div className="text-xs text-muted-foreground">{container.image}</div>
                </div>
                <StatusBadge status={container.state} />
              </div>
              <Select value={container.preference} onChange={(event) => saveContainer(container, event.target.value)}>
                <option value="optional">Optional</option>
                <option value="monitored">Monitored</option>
                <option value="critical">Critical</option>
                <option value="ignored">Ignored</option>
              </Select>
            </div>
          ))}
          {containers.length === 0 ? <div className="text-sm text-muted-foreground">No Docker containers available.</div> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uptime Checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1.5fr_.7fr_.7fr_auto]">
            <Input placeholder="Name" value={newCheck.name} onChange={(event) => setNewCheck({ ...newCheck, name: event.target.value })} />
            <Input placeholder="https://service.local" value={newCheck.url} onChange={(event) => setNewCheck({ ...newCheck, url: event.target.value })} />
            <Select value={newCheck.method} onChange={(event) => setNewCheck({ ...newCheck, method: event.target.value })}>
              <option value="GET">GET</option>
              <option value="HEAD">HEAD</option>
            </Select>
            <Input type="number" min={30} value={newCheck.interval_seconds} onChange={(event) => setNewCheck({ ...newCheck, interval_seconds: Number(event.target.value) })} />
            <Button onClick={addCheck} disabled={!newCheck.name || !newCheck.url}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
          <div className="grid gap-3">
            {uptimeChecks.map((check) => (
              <div key={check.id} className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">{check.name}</div>
                  <div className="text-sm text-muted-foreground">{check.url} - every {check.interval_seconds}s</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={check.critical ? "critical" : "optional"} />
                  <Button variant="outline" size="icon" onClick={() => deleteCheck(check.id)} title="Delete uptime check">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alert Rules and Warning Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {alertRules.map((rule) => (
            <div key={rule.key} className="grid gap-3 rounded-lg border border-border/60 p-3 md:grid-cols-[1fr_.8fr_.7fr_.7fr_.7fr] md:items-center">
              <div>
                <div className="font-medium">{rule.label}</div>
                <div className="text-xs text-muted-foreground">{rule.key}</div>
              </div>
              <Select value={rule.severity} onChange={(event) => saveRule(rule, { severity: event.target.value as AlertRule["severity"] })}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </Select>
              <Input
                type="number"
                value={rule.threshold ?? ""}
                placeholder="No threshold"
                onChange={(event) => saveRule(rule, { threshold: event.target.value ? Number(event.target.value) : null })}
              />
              <Select value={rule.enabled ? "enabled" : "disabled"} onChange={(event) => saveRule(rule, { enabled: event.target.value === "enabled" ? 1 : 0 })}>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </Select>
              <Select value={rule.muted ? "muted" : "prominent"} onChange={(event) => saveRule(rule, { muted: event.target.value === "muted" ? 1 : 0 })}>
                <option value="prominent">Prominent</option>
                <option value="muted">Muted</option>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(providerStatus).map(([key, status]) => (
              <div key={key} className="rounded-lg border border-border/60 p-3">
                <div className="font-medium">{key}</div>
                <div className="mt-1 text-sm text-muted-foreground">{status.message}</div>
              </div>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {secretProviders.map((envName) => (
              <div key={envName} className="rounded-md border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground">
                {envName}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
