export const runtime = "edge";

export async function POST() {
  return Response.json(
    { ok: false, error: "Article generation is disabled on Vercel. Use local environment." },
    { status: 400 }
  );
}
