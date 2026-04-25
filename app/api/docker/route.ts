import { dockerProvider } from "@/lib/providers";
import { jsonResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonResponse(async () => {
    const health = await dockerProvider.healthCheck();
    if (!health.ok) return { health, containers: [] };
    const status = await dockerProvider.fetchCurrentStatus();
    return { health, ...status };
  });
}
