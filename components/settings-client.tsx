"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlugZap, Plus, Save, TestTube2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import type { AlertRule, PublicIntegrationConfig, UptimeCheck } from "@/lib/db/repository";
import type { DockerContainer, ProviderKey } from "@/lib/providers/types";

type ProviderStatus = { configured: boolean; status?: string; message: string };

type SettingsClientProps = {
  settings: Record<string, string>;
  containers: DockerContainer[];
  alertRules: AlertRule[];
  uptimeChecks: UptimeCheck[];
  integrations: PublicIntegrationConfig[];
  providerStatus: Record<string, ProviderStatus>;
  enableActions: boolean;
};

type IntegrationDraft = {
  id?: string;
  provider: ProviderKey;
  display_name: string;
  enabled: boolean;
  base_url: string;
  api_key?: string;
  username?: string;
  password?: string;
  token?: string;
};

const providerOptions: { value: ProviderKey; label: string; needsApiKey?: boolean; needsToken?: boolean; needsCredentials?: boolean }[] = [
  { value: "radarr", label: "Radarr", needsApiKey: true },
  { value: "sonarr", label: "Sonarr", needsApiKey: true },
  { value: "prowlarr", label: "Prowlarr", needsApiKey: true },
  { value: "sabnzbd", label: "SABnzbd", needsApiKey: true },
  { value: "transmission", label: "Transmission", needsCredentials: true },
  { value: "plex", label: "Plex", needsToken: true },
  { value: "uptime-kuma", label: "Uptime Kuma", needsCredentials: true },
  { value: "speedtest", label: "Speedtest Tracker", needsApiKey: true },
  { value: "beszel", label: "Beszel", needsToken: true },
  { value: "tracearr", label: "Tracearr", needsApiKey: true }
];

function providerMeta(provider: ProviderKey) {
  return providerOptions.find((item) => item.value === provider) || providerOptions[0];
}

function fromConfig(config: PublicIntegrationConfig): IntegrationDraft {
  return {
    id: config.id,
    provider: config.provider,
    display_name: config.display_name,
    enabled: Boolean(config.enabled),
    base_url: config.base_url || "",
    username: config.username || ""
  };
}

export function SettingsClient({
  settings,
  containers,
  alertRules,
  uptimeChecks,
  integrations,
  providerStatus,
  enableActions
}: SettingsClientProps) {
  const router = useRouter();
  const [appName, setAppName] = useState(settings.appName || "");
  const [serverName, setServerName] = useState(settings.serverName || "");
  const [accent, setAccent] = useState(settings.accent || "teal");
  const [newCheck, setNewCheck] = useState({
    name: "",
    url: "",
    method: "GET",
    expected_status_code: 200,
    timeout_seconds: 8,
    interval_seconds: 60,
    critical: false,
    enabled: true
  });
  const [drafts, setDrafts] = useState<Record<string, IntegrationDraft>>(
    Object.fromEntries(integrations.map((config) => [config.id, fromConfig(config)]))
  );
  const [newIntegration, setNewIntegration] = useState<IntegrationDraft>({
    provider: "radarr",
    display_name: "Radarr",
    enabled: true,
    base_url: ""
  });
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const integrationRows = useMemo(
    () => integrations.map((config) => ({ config, draft: drafts[config.id] || fromConfig(config) })),
    [integrations, drafts]
  );

  async function post(type: string, payload: unknown) {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, payload })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Save failed");
    }
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
    setNewCheck({
      name: "",
      url: "",
      method: "GET",
      expected_status_code: 200,
      timeout_seconds: 8,
      interval_seconds: 60,
      critical: false,
      enabled: true
    });
  }

  async function deleteCheck(id: string) {
    await fetch(`/api/uptime/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function updateDraft(id: string, patch: Partial<IntegrationDraft>) {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] || { provider: "radarr", display_name: "", enabled: true, base_url: "" }), ...patch } }));
  }

  async function saveIntegration(draft: IntegrationDraft) {
    await post("integrationConfig", {
      ...draft,
      api_key: draft.api_key || undefined,
      password: draft.password || undefined,
      token: draft.token || undefined
    });
    if (!draft.id) {
      setNewIntegration({ provider: "radarr", display_name: "Radarr", enabled: true, base_url: "" });
    }
  }

  async function deleteIntegration(id: string) {
    await fetch(`/api/integrations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function testIntegration(id: string) {
    const response = await fetch("/api/integrations/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    const body = await response.json();
    setTestResults((current) => ({ ...current, [id]: body.error || `${body.status}: ${body.message}` }));
    router.refresh();
  }

  function renderIntegrationFields(draft: IntegrationDraft, onChange: (patch: Partial<IntegrationDraft>) => void, saved?: PublicIntegrationConfig) {
    const meta = providerMeta(draft.provider);
    return (
      <div className="grid gap-3 lg:grid-cols-[.9fr_1fr_1.4fr_.7fr]">
        <Select
          value={draft.provider}
          onChange={(event) => {
            const provider = event.target.value as ProviderKey;
            onChange({ provider, display_name: providerMeta(provider).label });
          }}
        >
          {providerOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
        <Input placeholder="Display name" value={draft.display_name} onChange={(event) => onChange({ display_name: event.target.value })} />
        <Input placeholder="Base URL, for example http://tower:7878" value={draft.base_url} onChange={(event) => onChange({ base_url: event.target.value })} />
        <Select value={draft.enabled ? "enabled" : "disabled"} onChange={(event) => onChange({ enabled: event.target.value === "enabled" })}>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </Select>
        {meta.needsApiKey ? (
          <Input
            placeholder={saved?.has_api_key ? "API key saved - leave blank to keep" : "API key"}
            value={draft.api_key || ""}
            onChange={(event) => onChange({ api_key: event.target.value })}
          />
        ) : null}
        {meta.needsToken ? (
          <Input
            placeholder={saved?.has_token ? "Token saved - leave blank to keep" : "Token"}
            value={draft.token || ""}
            onChange={(event) => onChange({ token: event.target.value })}
          />
        ) : null}
        {meta.needsCredentials ? (
          <>
            <Input placeholder="Username" value={draft.username || ""} onChange={(event) => onChange({ username: event.target.value })} />
            <Input
              type="password"
              placeholder={saved?.has_password ? "Password saved - leave blank to keep" : "Password"}
              value={draft.password || ""}
              onChange={(event) => onChange({ password: event.target.value })}
            />
          </>
        ) : null}
      </div>
    );
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
          <CardTitle>Provider Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(providerStatus).map(([key, status]) => (
              <div key={key} className="rounded-lg border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{key}</div>
                  <StatusBadge status={status.status || (status.configured ? "connected" : "not configured")} />
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{status.message}</div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border/60 p-3">
            <div className="mb-3 flex items-center gap-2 font-medium">
              <PlugZap className="h-4 w-4" />
              Add integration
            </div>
            {renderIntegrationFields(newIntegration, (patch) => setNewIntegration((current) => ({ ...current, ...patch })))}
            <Button className="mt-3" onClick={() => saveIntegration(newIntegration)} disabled={!newIntegration.display_name || !newIntegration.base_url}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {integrationRows.map(({ config, draft }) => (
            <div key={config.id} className="rounded-lg border border-border/60 p-3">
              <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-medium">{config.display_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {providerMeta(config.provider).label} - {config.last_message || "Not tested yet"}
                  </div>
                </div>
                <StatusBadge status={config.last_status || (config.enabled ? "not tested" : "disabled")} />
              </div>
              {renderIntegrationFields(draft, (patch) => updateDraft(config.id, patch), config)}
              {testResults[config.id] ? <div className="mt-2 text-sm text-muted-foreground">{testResults[config.id]}</div> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button onClick={() => saveIntegration(draft)}>
                  <Save className="h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => testIntegration(config.id)}>
                  <TestTube2 className="h-4 w-4" />
                  Test
                </Button>
                <Button variant="outline" size="icon" onClick={() => deleteIntegration(config.id)} title="Delete integration">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
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
          <div className="grid gap-3 md:grid-cols-[1fr_1.5fr_.55fr_.55fr_.55fr_.65fr_.65fr_.65fr_auto]">
            <Input placeholder="Name" value={newCheck.name} onChange={(event) => setNewCheck({ ...newCheck, name: event.target.value })} />
            <Input placeholder="https://service.local" value={newCheck.url} onChange={(event) => setNewCheck({ ...newCheck, url: event.target.value })} />
            <Select value={newCheck.method} onChange={(event) => setNewCheck({ ...newCheck, method: event.target.value })}>
              <option value="GET">GET</option>
              <option value="HEAD">HEAD</option>
            </Select>
            <Input type="number" min={100} max={599} value={newCheck.expected_status_code} onChange={(event) => setNewCheck({ ...newCheck, expected_status_code: Number(event.target.value) })} />
            <Input type="number" min={1} value={newCheck.timeout_seconds} onChange={(event) => setNewCheck({ ...newCheck, timeout_seconds: Number(event.target.value) })} />
            <Input type="number" min={30} value={newCheck.interval_seconds} onChange={(event) => setNewCheck({ ...newCheck, interval_seconds: Number(event.target.value) })} />
            <Select value={newCheck.enabled ? "enabled" : "disabled"} onChange={(event) => setNewCheck({ ...newCheck, enabled: event.target.value === "enabled" })}>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
            </Select>
            <Select value={newCheck.critical ? "critical" : "optional"} onChange={(event) => setNewCheck({ ...newCheck, critical: event.target.value === "critical" })}>
              <option value="optional">Optional</option>
              <option value="critical">Critical</option>
            </Select>
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
                  <div className="text-sm text-muted-foreground">
                    {check.url} - expect {check.expected_status_code} - timeout {check.timeout_seconds}s - every {check.interval_seconds}s
                  </div>
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
    </div>
  );
}
