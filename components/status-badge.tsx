import { Badge, type BadgeProps } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const variant: BadgeProps["variant"] =
    normalized.includes("healthy") || normalized.includes("online") || normalized.includes("running") || normalized === "good" || normalized === "connected"
      ? "success"
      : normalized.includes("warning") || normalized.includes("starting") || normalized.includes("not tested")
        ? "warning"
        : normalized.includes("offline") || normalized.includes("unhealthy") || normalized.includes("exited") || normalized === "danger" || normalized.includes("unavailable") || normalized.includes("error") || normalized.includes("critical")
          ? "danger"
          : "muted";
  return <Badge variant={variant}>{status.replace(/_/g, " ")}</Badge>;
}
