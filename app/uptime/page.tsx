import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardSnapshot } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function UptimePage() {
  const { uptime, providers } = await getDashboardSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Native uptime checks"
        title="Uptime"
        description="Uptime Kuma-style monitoring with latency, uptime percentage, downtime history, and compact status timelines."
      />
      <Card>
        <CardHeader>
          <CardTitle>{providers.uptime.message}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Last checked</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uptime.checks.map((check) => (
                <TableRow key={check.id}>
                  <TableCell>
                    <div className="font-medium">{check.name}</div>
                    <div className="text-xs text-muted-foreground">{check.url}</div>
                  </TableCell>
                  <TableCell><StatusBadge status={check.ok === null ? "pending" : check.ok ? "online" : "offline"} /></TableCell>
                  <TableCell>{check.uptimePercent}%</TableCell>
                  <TableCell>{check.latencyMs === null ? "n/a" : `${check.latencyMs} ms`}</TableCell>
                  <TableCell>{check.expectedStatusCode}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {check.timeline.length ? check.timeline.map((ok, index) => (
                        <span key={index} className={ok ? "h-6 w-2 rounded-sm bg-emerald-400" : "h-6 w-2 rounded-sm bg-red-400"} />
                      )) : <span className="text-sm text-muted-foreground">No history</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {check.checkedAt || "Never"}
                    {check.lastError ? <div className="mt-1 text-xs text-red-300">{check.lastError}</div> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {uptime.checks.length === 0 ? <div className="p-6 text-sm text-muted-foreground">No uptime checks configured. Add checks in Settings.</div> : null}
        </CardContent>
      </Card>
    </>
  );
}
