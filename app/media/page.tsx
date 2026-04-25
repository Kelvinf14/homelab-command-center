import { PipelineChart } from "@/components/charts";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardSnapshot } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const { media, providers } = await getDashboardSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Tracearr-inspired"
        title="Media Pipeline"
        description={providers.media.configured ? providers.media.message : "Placeholder data for Overseerr/Jellyseerr, Radarr, Sonarr, Prowlarr, SABnzbd, Transmission, and Plex."}
      />
      <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>App Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {media.apps.map((app) => (
              <div key={app.name} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
                <div>
                  <div className="font-medium">{app.name}</div>
                  <div className="text-sm text-muted-foreground">{app.detail}</div>
                </div>
                <StatusBadge status={app.status} />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <PipelineChart data={media.pipeline} />
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {media.pipeline.map((stage) => (
                <div key={stage.stage} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                  <span>{stage.stage}</span>
                  <StatusBadge status={`${stage.count} ${stage.status}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Queue Highlights</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {media.queue.map((item) => (
            <div key={`${item.app}-${item.title}`} className="rounded-lg border border-border/60 p-3">
              <div className="text-sm text-muted-foreground">{item.app}</div>
              <div className="mt-1 font-medium">{item.title}</div>
              <div className="mt-3 text-sm text-muted-foreground">{item.state} - {item.eta}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
