import { deleteUptimeCheck } from "@/lib/db/repository";
import { jsonResponse } from "@/lib/api";

export function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return jsonResponse(() => {
    deleteUptimeCheck(params.id);
    return { ok: true };
  });
}
