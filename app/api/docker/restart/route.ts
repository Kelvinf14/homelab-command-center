import { z } from "zod";
import { restartContainer } from "@/lib/providers/dockerProvider";
import { jsonResponse } from "@/lib/api";

const schema = z.object({ id: z.string().min(1) });

export async function POST(request: Request) {
  return jsonResponse(async () => {
    const { id } = schema.parse(await request.json());
    await restartContainer(id);
    return { ok: true };
  });
}
