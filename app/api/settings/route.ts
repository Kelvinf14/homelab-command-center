import { z } from "zod";
import {
  getAlertRules,
  getContainerPreferences,
  getPublicIntegrationConfigs,
  getSettings,
  getUptimeChecks,
  updateAlertRule,
  updateSettings,
  upsertIntegrationConfig,
  upsertContainerPreference,
  upsertUptimeCheck
} from "@/lib/db/repository";
import { jsonResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  appName: z.string().optional(),
  serverName: z.string().optional(),
  accent: z.string().optional()
});

const containerPreferenceSchema = z.object({
  container_id: z.string(),
  name: z.string(),
  monitored: z.boolean(),
  ignored: z.boolean(),
  critical: z.boolean(),
  optional: z.boolean()
});

const alertRuleSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  muted: z.boolean(),
  threshold: z.coerce.number().nullable(),
  severity: z.enum(["info", "warning", "critical"])
});

const uptimeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  url: z.string().url(),
  method: z.enum(["GET", "HEAD"]).default("GET"),
  expected_status_code: z.coerce.number().int().min(100).max(599).default(200),
  timeout_seconds: z.coerce.number().int().min(1).max(120).default(8),
  interval_seconds: z.coerce.number().int().min(30).default(60),
  critical: z.boolean().default(false),
  enabled: z.boolean().default(true)
});

const integrationSchema = z.object({
  id: z.string().optional(),
  provider: z.enum([
    "radarr",
    "sonarr",
    "prowlarr",
    "sabnzbd",
    "transmission",
    "plex",
    "uptime-kuma",
    "speedtest",
    "beszel",
    "tracearr"
  ]),
  display_name: z.string().min(1),
  enabled: z.boolean().default(false),
  base_url: z.string().optional().nullable(),
  api_key: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  token: z.string().optional().nullable()
});

export function GET() {
  return jsonResponse(() => ({
    settings: getSettings(),
    containerPreferences: getContainerPreferences(),
    uptimeChecks: getUptimeChecks(),
    integrations: getPublicIntegrationConfigs(),
    alertRules: getAlertRules(),
    enableActions: process.env.ENABLE_ACTIONS === "true"
  }));
}

export async function POST(request: Request) {
  return jsonResponse(async () => {
    const body = await request.json();
    if (body.type === "settings") {
      updateSettings(settingsSchema.parse(body.payload));
    }
    if (body.type === "containerPreference") {
      upsertContainerPreference(containerPreferenceSchema.parse(body.payload));
    }
    if (body.type === "alertRule") {
      const parsed = alertRuleSchema.parse(body.payload);
      updateAlertRule({
        ...parsed,
        enabled: parsed.enabled ? 1 : 0,
        muted: parsed.muted ? 1 : 0
      });
    }
    if (body.type === "uptimeCheck") {
      const parsed = uptimeSchema.parse(body.payload);
      upsertUptimeCheck({
        ...parsed,
        critical: parsed.critical ? 1 : 0,
        enabled: parsed.enabled ? 1 : 0
      });
    }
    if (body.type === "integrationConfig") {
      const parsed = integrationSchema.parse(body.payload);
      upsertIntegrationConfig({
        ...parsed,
        enabled: parsed.enabled ? 1 : 0
      });
    }
    return { ok: true };
  });
}
