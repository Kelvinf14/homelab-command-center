import { PageHeader } from "@/components/page-header";
import { SettingsClient } from "@/components/settings-client";
import { getAlertRules, getUptimeChecks } from "@/lib/db/repository";
import { getDashboardSnapshot } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Control plane"
        title="Settings"
        description="Configure monitored assets, uptime checks, API integration placeholders, alert thresholds, warning preferences, and runtime safety."
      />
      <SettingsClient
        settings={snapshot.settings}
        containers={snapshot.docker.containers}
        alertRules={getAlertRules()}
        uptimeChecks={getUptimeChecks()}
        providerStatus={{
          Docker: snapshot.providers.docker,
          Beszel: snapshot.providers.beszel,
          Uptime: snapshot.providers.uptime,
          Speedtest: snapshot.providers.speedtest,
          Tracearr: snapshot.providers.media
        }}
        enableActions={process.env.ENABLE_ACTIONS === "true"}
      />
    </>
  );
}
