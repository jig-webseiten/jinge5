// apps/site/app/sitemap.xml/route.ts
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs"; // wichtig: fs braucht Node runtime
export const dynamic = "force-dynamic"; // Sitemap soll host-abhängig sein

function findProjectRoot(): string {
  // bei dir existiert projectRoot/sites/<siteId>/content
  const candidates = [
    path.resolve(process.cwd(), "..", ".."), // häufig: apps/site -> repo root
    process.cwd(),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(path.join(cand, "sites"))) return cand;
  }
  return process.cwd();
}

function parseHost(req: Request): { host: string; proto: string } {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return { host, proto };
}

/**
 * Leitet siteId aus der Subdomain ab:
 *  - camping-hero.garden-hero.net -> camping-hero
 *  - garden-hero.garden-hero.net  -> garden-hero
 * Fallback: SITE_ID oder garden-hero
 */
function resolveSiteIdFromHost(host: string): string {
  const hostname = host.split(":")[0].toLowerCase();

  // Beispiel: *.garden-hero.net
  const suffix = ".garden-hero.net";
  if (hostname.endsWith(suffix)) {
    const sub = hostname.slice(0, -suffix.length);
    // falls jemand garden-hero.net ohne sub aufruft (optional)
    if (!sub || sub === "www") return process.env.SITE_ID ?? "garden-hero";
    return sub;
  }

  // lokale Dev-Hosts optional:
  // camping-hero.local -> camping-hero
  if (hostname.endsWith(".local")) {
    return hostname.replace(/\.local$/, "");
  }

  return process.env.SITE_ID ?? "garden-hero";
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

type UrlEntry = { loc: string; lastmod?: string };

function toIsoDate(d: Date): string {
  // Sitemap akzeptiert Date oder DateTime; wir geben DateTime aus
  return d.toISOString();
}

function collectUrls(baseUrl: string, contentDir: string): UrlEntry[] {
  const urls: UrlEntry[] = [{ loc: `${baseUrl}/`, lastmod: toIsoDate(new Date()) }];

  if (!fs.existsSync(contentDir)) return urls;

  const categoryDirs = fs.readdirSync(contentDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const cat of categoryDirs) {
    const catPath = path.join(contentDir, cat);
    const catStat = fs.statSync(catPath);

    // Kategorie-Index
    urls.push({
      loc: `${baseUrl}/${encodeURIComponent(cat)}`,
      lastmod: toIsoDate(catStat.mtime),
    });

    // Artikel in der Kategorie
    const files = fs.readdirSync(catPath, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.toLowerCase().endsWith(".mdx"))
      .map((f) => f.name);

    for (const file of files) {
      const full = path.join(catPath, file);
      const stat = fs.statSync(full);
      const slug = file.replace(/\.mdx$/i, "");

      urls.push({
        loc: `${baseUrl}/${encodeURIComponent(cat)}/${encodeURIComponent(slug)}`,
        lastmod: toIsoDate(stat.mtime),
      });
    }
  }

  return urls;
}

function renderSitemapXml(urls: UrlEntry[]): string {
  const body = urls
    .map((u) => {
      const loc = xmlEscape(u.loc);
      const lastmod = u.lastmod ? `<lastmod>${xmlEscape(u.lastmod)}</lastmod>` : "";
      return `<url><loc>${loc}</loc>${lastmod}</url>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    body +
    `</urlset>`;
}

export async function GET(req: Request) {
  const { host, proto } = parseHost(req);
  const siteId = resolveSiteIdFromHost(host);

  const projectRoot = findProjectRoot();
  const contentDir = path.join(projectRoot, "sites", siteId, "content");

  const baseUrl = `${proto}://${host}`;
  const urls = collectUrls(baseUrl, contentDir);
  const xml = renderSitemapXml(urls);

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // kurze Cache-Zeit ist bei dir sinnvoll (viel Generierung)
      "Cache-Control": "public, max-age=300",
    },
  });
}
