import { ResourceChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function ServerPage() {
  const { server, providers, docker } = await getDashboardSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Beszel-style metrics"
        title="Server Metrics"
        description={providers.beszel.configured ? providers.beszel.message : "Provider not configured yet, so this page shows clean placeholder data."}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="CPU Load" value={`${server.cpu}%`} progress={server.cpu} />
        <MetricCard title="Memory" value={`${server.ram}%`} progress={server.ram} />
        <MetricCard title="Disk" value={`${server.disk}%`} progress={server.disk} />
        <MetricCard title="Uptime" value={server.uptime} detail={`${server.networkIn} MB/s in`} />
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Resource History</CardTitle>
        </CardHeader>
        <CardContent>
          <ResourceChart data={server.history} />
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Container Resource Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {docker.containers.slice(0, 6).map((container) => (
            <div key={container.id} className="rounded-lg border border-border/60 p-3">
              <div className="font-medium">{container.name}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                CPU {container.cpuPercent ?? 0}% - Memory {container.memoryUsage ? Math.round(container.memoryUsage / 1024 / 1024) : 0} MB
              </div>
            </div>
          ))}
          {docker.containers.length === 0 ? <div className="text-sm text-muted-foreground">Docker socket not configured or no containers found.</div> : null}
        </CardContent>
      </Card>
    </>
  );
}
