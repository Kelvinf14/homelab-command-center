import { performance } from "node:perf_hooks";
import {
  getLatestUptimeResults,
  getUptimeChecks,
  getUptimeHistory,
  insertUptimeResult
} from "@/lib/db/repository";
import type { Provider, UptimeStatus } from "@/lib/providers/types";

async function runCheck(url: string, method: "GET" | "HEAD") {
  const started = performance.now();
  try {
    const response = await fetch(url, { method, cache: "no-store", signal: AbortSignal.timeout(8000) });
    return {
      ok: response.ok,
      statusCode: response.status,
      latencyMs: Math.round(performance.now() - started),
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: null,
      latencyMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : "Request failed"
    };
  }
}

export async function runDueUptimeChecks() {
  const checks = getUptimeChecks().filter((check) => check.enabled);
  const latest = new Map(getLatestUptimeResults().map((result) => [result.check_id, result]));

  await Promise.all(
    checks.map(async (check) => {
      const last = latest.get(check.id);
      const elapsed = last ? (Date.now() - new Date(last.checked_at).getTime()) / 1000 : Number.POSITIVE_INFINITY;
      if (elapsed < check.interval_seconds) return;
      const result = await runCheck(check.url, check.method);
      insertUptimeResult({
        check_id: check.id,
        ok: result.ok,
        status_code: result.statusCode,
        latency_ms: result.latencyMs,
        error: result.error
      });
    })
  );
}

export const uptimeProvider: Provider<{ checks: UptimeStatus[] }> = {
  key: "uptime",
  name: "Native uptime checks",
  async healthCheck() {
    const checks = getUptimeChecks();
    return {
      configured: checks.length > 0,
      ok: true,
      message: checks.length > 0 ? `${checks.length} uptime checks configured` : "No uptime checks configured"
    };
  },
  async fetchCurrentStatus() {
    await runDueUptimeChecks();
    const checks = getUptimeChecks();
    const latest = new Map(getLatestUptimeResults().map((result) => [result.check_id, result]));
    const history = getUptimeHistory(500);
    const byCheck = new Map<string, typeof history>();
    history.forEach((item) => {
      byCheck.set(item.check_id, [...(byCheck.get(item.check_id) || []), item]);
    });

    return {
      checks: checks.map((check) => {
        const itemHistory = byCheck.get(check.id) || [];
        const upCount = itemHistory.filter((item) => item.ok).length;
        const latestResult = latest.get(check.id);
        return {
          id: check.id,
          name: check.name,
          url: check.url,
          enabled: Boolean(check.enabled),
          critical: Boolean(check.critical),
          ok: latestResult ? Boolean(latestResult.ok) : null,
          latencyMs: latestResult?.latency_ms ?? null,
          uptimePercent: itemHistory.length ? Math.round((upCount / itemHistory.length) * 1000) / 10 : 100,
          statusCode: latestResult?.status_code ?? null,
          checkedAt: latestResult?.checked_at ?? null,
          timeline: itemHistory.slice(0, 24).reverse().map((item) => Boolean(item.ok))
        };
      })
    };
  },
  async fetchHistory() {
    return getUptimeHistory();
  },
  normalizeData(input) {
    return input as { checks: UptimeStatus[] };
  }
};
