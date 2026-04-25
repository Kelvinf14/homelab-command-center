import { DockerPreferenceForm } from "@/components/docker-preference-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDashboardSnapshot } from "@/lib/dashboard";
import { formatBytes, formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DockerPage() {
  const snapshot = await getDashboardSnapshot();

  return (
    <>
      <PageHeader
        eyebrow="Docker socket"
        title="Docker Containers"
        description="Read-only by default. Choose exactly which containers are monitored, ignored, critical, or optional."
      />
      <Card>
        <CardHeader>
          <CardTitle>{snapshot.docker.containers.length} containers</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Ports</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead>Restarts</TableHead>
                <TableHead>Health</TableHead>
                <TableHead>Preference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.docker.containers.map((container) => (
                <TableRow key={container.id}>
                  <TableCell>
                    <div className="font-medium">{container.name}</div>
                    <div className="text-xs text-muted-foreground">{formatDuration(container.uptimeSeconds)}</div>
                  </TableCell>
                  <TableCell><StatusBadge status={container.state} /></TableCell>
                  <TableCell className="max-w-52 truncate text-muted-foreground">{container.image}</TableCell>
                  <TableCell className="max-w-44 text-muted-foreground">{container.ports.join(", ") || "None"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {container.cpuPercent ?? 0}% CPU - {formatBytes(container.memoryUsage || 0)}
                  </TableCell>
                  <TableCell>{container.restartCount}</TableCell>
                  <TableCell><StatusBadge status={container.health} /></TableCell>
                  <TableCell className="min-w-64">
                    <DockerPreferenceForm container={container} enableActions={process.env.ENABLE_ACTIONS === "true"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {snapshot.docker.containers.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">{snapshot.providers.docker.message}</div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
