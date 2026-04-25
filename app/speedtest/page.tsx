import { SpeedChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function SpeedtestPage() {
  const { speedtest, providers } = await getDashboardSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Speedtest Tracker"
        title="Internet Speed"
        description={speedtest.message}
      />

      {!speedtest.latest ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              Speedtest provider
              <StatusBadge status={providers.speedtest.status} />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {speedtest.status === "not_configured" ? "Speedtest provider not configured." : speedtest.message}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Download" value={speedtest.latest.download === null ? "n/a" : `${speedtest.latest.download} Mbps`} />
            <MetricCard title="Upload" value={speedtest.latest.upload === null ? "n/a" : `${speedtest.latest.upload} Mbps`} />
            <MetricCard title="Ping" value={speedtest.latest.ping === null ? "n/a" : `${speedtest.latest.ping} ms`} />
            <MetricCard title="Jitter" value={speedtest.latest.jitter === null ? "n/a" : `${speedtest.latest.jitter} ms`} detail={speedtest.latest.isp || undefined} />
          </div>
          {speedtest.history.length ? (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Historical Results</CardTitle>
              </CardHeader>
              <CardContent>
                <SpeedChart data={speedtest.history.map((item) => ({ time: item.time, download: item.download ?? 0, upload: item.upload ?? 0, ping: item.ping ?? 0 }))} />
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </>
  );
}
