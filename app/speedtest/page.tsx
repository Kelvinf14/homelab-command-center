import { SpeedChart } from "@/components/charts";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function SpeedtestPage() {
  const { speedtest, providers } = await getDashboardSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Speedtest Tracker-style"
        title="Internet Speed"
        description={providers.speedtest.configured ? providers.speedtest.message : "Using placeholder speed data until Speedtest Tracker is configured."}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Download" value={`${speedtest.latest.download} Mbps`} detail={`Average ${speedtest.averages.download} Mbps`} />
        <MetricCard title="Upload" value={`${speedtest.latest.upload} Mbps`} detail={`Average ${speedtest.averages.upload} Mbps`} />
        <MetricCard title="Ping" value={`${speedtest.latest.ping} ms`} detail={`${speedtest.latest.jitter} ms jitter`} />
        <MetricCard title="Best / Worst" value={`${speedtest.best}/${speedtest.worst}`} detail={speedtest.latest.isp} />
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Historical Results</CardTitle>
        </CardHeader>
        <CardContent>
          <SpeedChart data={speedtest.history} />
        </CardContent>
      </Card>
    </>
  );
}
