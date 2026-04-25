import { getDashboardSnapshot } from "@/lib/dashboard";
import { jsonResponse } from "@/lib/api";

export const dynamic = "force-dynamic";

export function GET() {
  return jsonResponse(() => getDashboardSnapshot());
}
