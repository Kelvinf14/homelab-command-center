import { Badge, type BadgeProps } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const variant: BadgeProps["variant"] =
    normalized.includes("healthy") || normalized.includes("online") || normalized.includes("running") || normalized === "good"
      ? "success"
      : normalized.includes("warning") || normalized.includes("starting")
        ? "warning"
        : normalized.includes("offline") || normalized.includes("unhealthy") || normalized.includes("exited") || normalized === "danger"
          ? "danger"
          : "muted";
  return <Badge variant={variant}>{status}</Badge>;
}
