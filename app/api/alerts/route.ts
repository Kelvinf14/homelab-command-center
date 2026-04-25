import { getAlerts } from "@/lib/db/repository";
import { jsonResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

export function GET() {
  return jsonResponse(() => ({ alerts: getAlerts() }));
}
