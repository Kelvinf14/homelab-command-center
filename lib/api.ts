export async function jsonResponse<T>(fn: () => Promise<T> | T, init?: ResponseInit) {
  try {
    const data = await fn();
    return Response.json(data, init);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
