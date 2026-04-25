"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { DockerContainer } from "@/lib/providers/types";

export function DockerPreferenceForm({ container, enableActions }: { container: DockerContainer; enableActions: boolean }) {
  const router = useRouter();

  async function setPreference(value: string) {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "containerPreference",
        payload: {
          container_id: container.id,
          name: container.name,
          monitored: value === "monitored" || value === "critical",
          ignored: value === "ignored",
          critical: value === "critical",
          optional: value === "optional"
        }
      })
    });
    router.refresh();
  }

  async function restart() {
    await fetch("/api/docker/restart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: container.id })
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={container.preference} onChange={(event) => setPreference(event.target.value)}>
        <option value="optional">Optional</option>
        <option value="monitored">Monitored</option>
        <option value="critical">Critical</option>
        <option value="ignored">Ignored</option>
      </Select>
      {enableActions ? (
        <Button variant="outline" size="icon" onClick={restart} title="Restart container">
          <RotateCcw className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
