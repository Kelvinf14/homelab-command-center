import { getAlerts, getSettings } from "@/lib/db/repository";
import { evaluateAlerts, calculateHealthScore } from "@/lib/alerts";
import { beszelProvider, dockerProvider, mediaPipelineProvider, speedtestProvider, uptimeProvider } from "@/lib/providers";

export async function getDashboardSnapshot() {
  const settings = getSettings();
  const [dockerHealth, beszelHealth, uptimeHealth, speedHealth, mediaHealth] = await Promise.all([
    dockerProvider.healthCheck(),
    beszelProvider.healthCheck(),
    uptimeProvider.healthCheck(),
    speedtestProvider.healthCheck(),
    mediaPipelineProvider.healthCheck()
  ]);

  const [server, speedtest, uptime, media, docker] = await Promise.all([
    beszelProvider.fetchCurrentStatus(),
    speedtestProvider.fetchCurrentStatus(),
    uptimeProvider.fetchCurrentStatus(),
    mediaPipelineProvider.fetchCurrentStatus(),
    dockerHealth.configured ? dockerProvider.fetchCurrentStatus() : Promise.resolve({ containers: [] })
  ]);

  evaluateAlerts({
    containers: docker.containers,
    uptimeChecks: uptime.checks,
    serverDisk: server.disk,
    speedDownload: speedtest.latest.download
  });

  const alerts = getAlerts("active");
  const visibleAlerts = alerts.filter((alert) => !alert.ignored && !alert.muted);
  const healthScore = calculateHealthScore(alerts);

  return {
    settings,
    health: {
      score: healthScore,
      label: healthScore >= 90 ? "Excellent" : healthScore >= 75 ? "Stable" : healthScore >= 55 ? "Degraded" : "Needs attention"
    },
    providers: {
      docker: dockerHealth,
      beszel: beszelHealth,
      uptime: uptimeHealth,
      speedtest: speedHealth,
      media: mediaHealth
    },
    docker,
    server,
    uptime,
    speedtest,
    media,
    alerts,
    visibleAlerts
  };
}
