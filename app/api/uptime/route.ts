import { uptimeProvider } from "@/lib/providers";
import { jsonResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

export function GET() {
  return jsonResponse(() => uptimeProvider.fetchCurrentStatus());
}
