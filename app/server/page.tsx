import { ResourceChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/dashboard";
import { formatBytes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ServerPage() {
  const { server, providers, docker } = await getDashboardSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Real metrics only"
        title="Server Metrics"
        description={server.message}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            Server metrics provider
            <StatusBadge status={providers.beszel.status} />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {server.status === "not_configured" ? "Server metrics provider not configured." : server.message}
        </CardContent>
      </Card>

      {server.metrics ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="CPU Load" value={server.metrics.cpuPercent === null || server.metrics.cpuPercent === undefined ? "n/a" : `${server.metrics.cpuPercent}%`} progress={server.metrics.cpuPercent ?? undefined} />
          <MetricCard title="Memory" value={server.metrics.memoryPercent === null || server.metrics.memoryPercent === undefined ? "n/a" : `${server.metrics.memoryPercent}%`} progress={server.metrics.memoryPercent ?? undefined} />
          <MetricCard title="Disk" value={server.metrics.diskPercent === null || server.metrics.diskPercent === undefined ? "n/a" : `${server.metrics.diskPercent}%`} progress={server.metrics.diskPercent ?? undefined} />
          <MetricCard title="Uptime" value={server.metrics.uptime || "n/a"} />
        </div>
      ) : null}

      {server.history.length ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Resource History</CardTitle>
          </CardHeader>
          <CardContent>
            <ResourceChart data={server.history.map((item) => ({ time: item.time, cpu: item.cpu ?? 0, ram: item.ram ?? 0, disk: item.disk ?? 0 }))} />
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Docker Resource Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {docker.containers.map((container) => (
            <div key={container.id} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{container.name}</div>
                <StatusBadge status={container.state} />
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                CPU {container.cpuPercent === null ? "n/a" : `${container.cpuPercent}%`} - Memory {container.memoryUsage === null ? "n/a" : formatBytes(container.memoryUsage)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Network: {container.networkMode}</div>
            </div>
          ))}
          {docker.containers.length === 0 ? <div className="text-sm text-muted-foreground">{providers.docker.message}</div> : null}
        </CardContent>
      </Card>
    </>
  );
}
