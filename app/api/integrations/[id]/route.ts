import { deleteIntegrationConfig } from "@/lib/db/repository";
import { jsonResponse } from "@/lib/api";

export function DELETE(_request: Request, { params }: { params: { id: string } }) {
  return jsonResponse(() => {
    deleteIntegrationConfig(params.id);
    return { ok: true };
  });
}
