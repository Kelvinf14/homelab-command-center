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
        eyebrow="Real integrations"
        title="Media Pipeline"
        description={media.configured ? providers.media.message : "No media integrations configured yet. Add Radarr, Sonarr, SABnzbd, Transmission, Plex, or Prowlarr in Settings."}
      />

      {!media.configured ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No media integrations configured yet. Add Radarr, Sonarr, SABnzbd, Transmission, Plex, or Prowlarr in Settings.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configured Apps</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {media.apps.map((app) => (
                <div key={app.id} className="rounded-lg border border-border/60 p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="font-medium">{app.name}</div>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="text-sm text-muted-foreground">{app.message}</div>
                  {app.version ? <div className="mt-1 text-xs text-muted-foreground">Version {app.version}</div> : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Queue Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {media.queue.map((item, index) => (
                  <div key={`${item.source}-${item.title}-${index}`} className="rounded-lg border border-border/60 p-3">
                    <div className="text-sm text-muted-foreground">{item.source}</div>
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.status}{item.size ? ` - ${item.size}` : ""}</div>
                  </div>
                ))}
                {media.queue.length === 0 ? <div className="text-sm text-muted-foreground">No queued media items reported.</div> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Download Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {media.downloads.map((item) => (
                  <div key={item.source} className="rounded-lg border border-border/60 p-3">
                    <div className="font-medium">{item.source}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Down {item.downloadSpeed || "n/a"} - Up {item.uploadSpeed || "n/a"} - Queue {item.queueCount ?? "n/a"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Paused {item.pausedCount ?? 0} - Errors {item.errorCount ?? 0}
                    </div>
                  </div>
                ))}
                {media.downloads.length === 0 ? <div className="text-sm text-muted-foreground">No download clients configured or reporting data.</div> : null}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Import / Health Issues</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {media.issues.map((issue, index) => (
                  <div key={`${issue.source}-${index}`} className="rounded-lg border border-border/60 p-3">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div className="font-medium">{issue.source}</div>
                      <StatusBadge status={issue.severity} />
                    </div>
                    <div className="text-sm text-muted-foreground">{issue.message}</div>
                  </div>
                ))}
                {media.issues.length === 0 ? <div className="text-sm text-muted-foreground">No health or import issues reported.</div> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Missing / Wanted</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {media.missing.map((item) => (
                  <div key={`${item.source}-${item.label}`} className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                    <div>
                      <div className="font-medium">{item.source}</div>
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                    </div>
                    <div className="text-2xl font-semibold">{item.count}</div>
                  </div>
                ))}
                {media.missing.length === 0 ? <div className="text-sm text-muted-foreground">No missing or wanted media reported.</div> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {media.recent.map((item, index) => (
                  <div key={`${item.source}-${item.title}-${index}`} className="rounded-lg border border-border/60 p-3">
                    <div className="text-sm text-muted-foreground">{item.source}</div>
                    <div className="font-medium">{item.title}</div>
                    {item.when ? <div className="mt-1 text-xs text-muted-foreground">{item.when}</div> : null}
                  </div>
                ))}
                {media.recent.length === 0 ? <div className="text-sm text-muted-foreground">No recent activity reported.</div> : null}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
