"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, EyeOff, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AlertActions({ id }: { id: string }) {
  const router = useRouter();
  async function patch(disposition: "muted" | "ignored" | "resolved") {
    await fetch(`/api/alerts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disposition, enabled: true })
    });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => patch("muted")}>
        <VolumeX className="h-3.5 w-3.5" />
        Mute
      </Button>
      <Button variant="outline" size="sm" onClick={() => patch("ignored")}>
        <EyeOff className="h-3.5 w-3.5" />
        Ignore
      </Button>
      <Button variant="secondary" size="sm" onClick={() => patch("resolved")}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        Resolve
      </Button>
    </div>
  );
}
