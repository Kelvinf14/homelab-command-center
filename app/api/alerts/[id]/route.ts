import { z } from "zod";
import { setAlertDisposition } from "@/lib/db/repository";
import { jsonResponse } from "@/lib/api";

const schema = z.object({
  disposition: z.enum(["muted", "ignored", "resolved"]),
  enabled: z.boolean().default(true)
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return jsonResponse(async () => {
    const body = schema.parse(await request.json());
    setAlertDisposition(decodeURIComponent(params.id), body.disposition, body.enabled);
    return { ok: true };
  });
}
