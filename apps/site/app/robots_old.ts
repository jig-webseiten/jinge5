// apps/site/app/robots.txt/route.ts
export const dynamic = "force-dynamic";

function parseHost(req: Request): { host: string; proto: string } {
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return { host, proto };
}

export async function GET(req: Request) {
  const { host, proto } = parseHost(req);

  // Disallow: Impressum/Datenschutz (Crawling sperren)
  // Passe die Slugs an, falls du andere Routen nutzt
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    // Technische Ausschlüsse
    "Disallow: /api/",
    "Disallow: /preview/",
    "",
    // Rechtliches ausschließen (Crawl)
    "Disallow: /impressum",
    "Disallow: /datenschutz",
    "",
    // Host-spezifische Sitemap
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
