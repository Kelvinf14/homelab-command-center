import { AlertTriangle, CheckCircle2, RadioTower, Server, ShieldAlert, Wifi } from "lucide-react";
import { AlertActions } from "@/components/alert-actions";
import { MetricCard } from "@/components/metric-card";
import { MotionPanel } from "@/components/motion-panel";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDashboardSnapshot } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const snapshot = await getDashboardSnapshot();
  const running = snapshot.docker.containers.filter((container) => container.state === "running").length;
  const uptimeOnline = snapshot.uptime.checks.filter((check) => check.ok === true).length;
  const uptimeConfigured = snapshot.uptime.checks.length;
  const mediaConnected = snapshot.media.apps.filter((app) => app.status === "connected").length;

  return (
    <>
      <PageHeader
        eyebrow="Single pane dashboard"
        title={snapshot.settings.appName || "HomeLab Command Center"}
        description="Server health, Docker status, uptime checks, internet quality, media automation, and the next thing that needs your attention."
      />

      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <MotionPanel>
          <Card className="glass-panel overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">{snapshot.settings.serverName}</span>
                  </div>
                  <div className="text-7xl font-semibold tracking-normal">{snapshot.health.score}</div>
                  <div className="mt-2 text-lg text-muted-foreground">{snapshot.health.label}</div>
                </div>
                <div className="min-w-0 flex-1 md:max-w-md">
                  <Progress value={snapshot.health.score} className="h-3" />
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                      <div className="text-muted-foreground">Active alerts</div>
                      <div className="mt-1 text-2xl font-semibold">{snapshot.alerts.filter((a) => a.status === "active").length}</div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                      <div className="text-muted-foreground">Critical</div>
                      <div className="mt-1 text-2xl font-semibold">{snapshot.alerts.filter((a) => a.severity === "critical" && a.status === "active").length}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionPanel>

        <MotionPanel delay={0.05}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Needs Attention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshot.visibleAlerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="rounded-lg border border-border/60 bg-background/40 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="font-medium">{alert.title}</div>
                    <Badge variant={alert.severity === "critical" ? "danger" : "warning"}>{alert.severity}</Badge>
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">{alert.message}</p>
                  <AlertActions id={alert.id} />
                </div>
              ))}
              {snapshot.visibleAlerts.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-emerald-200">
                  <CheckCircle2 className="h-5 w-5" />
                  Nothing prominent needs attention.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </MotionPanel>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Server" value={snapshot.server.status === "connected" ? "Connected" : snapshot.server.status === "unavailable" ? "Unavailable" : "Not configured"} detail={snapshot.server.message} />
        <MetricCard title="Docker" value={`${running}/${snapshot.docker.containers.length}`} detail={snapshot.providers.docker.message} progress={snapshot.docker.containers.length ? (running / snapshot.docker.containers.length) * 100 : 0} />
        <MetricCard title="Uptime" value={uptimeConfigured ? `${uptimeOnline}/${uptimeConfigured}` : "Not set"} detail={snapshot.providers.uptime.message} />
        <MetricCard
          title="Internet"
          value={snapshot.speedtest.latest ? (snapshot.speedtest.latest.download === null ? "n/a" : `${snapshot.speedtest.latest.download} Mbps`) : snapshot.speedtest.status === "unavailable" ? "Unavailable" : "Not configured"}
          detail={snapshot.speedtest.latest ? `${snapshot.speedtest.latest.upload ?? "n/a"} Mbps up, ${snapshot.speedtest.latest.ping ?? "n/a"} ms ping` : snapshot.speedtest.message}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Server className="h-4 w-4" /> Server Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div>Status: {snapshot.server.status}</div>
            <div>{snapshot.server.message}</div>
            {snapshot.server.metrics ? (
              <div>
                CPU {snapshot.server.metrics.cpuPercent ?? "n/a"}% - Memory {snapshot.server.metrics.memoryPercent ?? "n/a"}% - Disk {snapshot.server.metrics.diskPercent ?? "n/a"}%
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wifi className="h-4 w-4" /> Internet Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {snapshot.speedtest.latest ? (
              <>
                <div>ISP: {snapshot.speedtest.latest.isp || "Unknown"}</div>
                <div>Jitter: {snapshot.speedtest.latest.jitter ?? "n/a"} ms</div>
                <div>Latest test: {snapshot.speedtest.latest.at || "Unknown"}</div>
              </>
            ) : (
              <div>{snapshot.speedtest.message}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><RadioTower className="h-4 w-4" /> Media Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {snapshot.media.configured ? (
              <>
                <div>{mediaConnected}/{snapshot.media.apps.length} apps connected</div>
                <div>{snapshot.media.issues.length} issue(s), {snapshot.media.queue.length} queued item(s)</div>
              </>
            ) : (
              <div>No media integrations configured.</div>
            )}
            <div>Provider: {snapshot.providers.media.message}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.alerts.slice(0, 6).map((alert) => (
            <div key={alert.id} className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-medium">{alert.title}</div>
                <div className="text-sm text-muted-foreground">{alert.message}</div>
              </div>
              <StatusBadge status={alert.status} />
            </div>
          ))}
          {snapshot.alerts.length === 0 ? <div className="text-sm text-muted-foreground">No incidents logged yet.</div> : null}
        </CardContent>
      </Card>
    </>
  );
}
