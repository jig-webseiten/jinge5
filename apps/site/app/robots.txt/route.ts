// apps/site/app/robots.txt/route.ts
export const dynamic = "force-dynamic";

function parseHost(req: Request) {
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return { host, proto };
}

export async function GET(req: Request) {
  const { host, proto } = parseHost(req);

  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    "Disallow: /api/",
    "Disallow: /preview/",
    "Disallow: /impressum",
    "Disallow: /datenschutz",
    "",
    `Sitemap: ${proto}://${host}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
