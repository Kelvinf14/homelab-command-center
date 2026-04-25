import { z } from "zod";
import { jsonResponse } from "@/lib/api";
import { testIntegration } from "@/lib/providers/integrationProvider";

const schema = z.object({ id: z.string().min(1) });

export async function POST(request: Request) {
  return jsonResponse(async () => {
    const { id } = schema.parse(await request.json());
    return testIntegration(id);
  });
}
