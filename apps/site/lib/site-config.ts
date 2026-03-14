// apps/site/lib/site-config.ts
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { headers } from "next/headers";

type SiteConfig = Record<string, any>;

const ROOT_DOMAIN = "trennschleifer-profi.de";

/**
 * Custom Domains müssen explizit gemappt werden, weil sie nicht als Subdomain
 * von ROOT_DOMAIN erkannt werden können.
 */
const CUSTOM_DOMAIN_MAP: Record<string, string> = {
  // Hof & Kuh
  "hof-und-kuh.de": "hof-und-kuh",
  "www.hof-und-kuh.de": "hof-und-kuh",

  // Garden Hero (Hauptdomain)
  "garden-hero.net": "garden-hero",
  "www.garden-hero.net": "garden-hero",

  // optional: explizite Subdomains (hilft beim Debuggen / Domain-UI)
  "hof-und-kuh.garden-hero.net": "hof-und-kuh",
  "garden-hero.garden-hero.net": "garden-hero",
};

function normalizeHost(host: string): string {
  return host.toLowerCase().split(":")[0].trim();
}

/**
 * Host -> siteId
 * Regeln:
 * 1) Custom domain map
 * 2) <siteId>.local
 * 3) <siteId>.garden-hero.net  (wildcard)
 * 4) *.vercel.app (preview)
 */
export function siteIdFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const h = normalizeHost(host);
  if (!h) return null;

  // 1) Custom domains first
  const mapped = CUSTOM_DOMAIN_MAP[h];
  if (mapped) return mapped;

  // 2) local dev
  if (h.endsWith(".local")) {
    const sub = h.slice(0, -".local".length);
    if (!sub || sub === "www") return null;
    return sub;
  }

  // 3) root domain
  if (h === ROOT_DOMAIN || h === `www.${ROOT_DOMAIN}`) {
    return "trennschleifer-profi";
  }

  // 3b) wildcard: <siteId>.garden-hero.net
  if (h.endsWith(`.${ROOT_DOMAIN}`)) {
    const left = h.slice(0, -(ROOT_DOMAIN.length + 1));
    if (!left || left === "www") return "trennschleifer-profi";
    return left;
  }

  // 4) preview: <something>.vercel.app
  if (h.endsWith(".vercel.app")) {
    const parts = h.split(".");
    if (parts.length >= 3 && parts[0]) return parts[0];
  }

  return null;
}

/**
 * Absoluter Pfad zu sites/<siteId>/config.json
 */
function siteConfigPath(siteId: string): string {
  // Passe das ggf. an deine Repo-Struktur an.
  // Häufig: apps/site/sites/<siteId>/config.json
  return path.join(process.cwd(), "sites", siteId, "config.json");
}

function readJsonFile(filePath: string): any {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Primärfunktion, die überall in App/SSR genutzt wird.
 * Priorität:
 * 1) explizites Override (Parameter)
 * 2) Middleware-Header x-site-id
 * 3) Hostname-Fallback
 * 4) ENV SITE_ID
 * 5) Default garden-hero
 */
export function getSiteConfig(siteIdOverride?: string): SiteConfig {
  const h = headers();

  const siteIdHeader = h.get("x-site-id")?.trim();
  const hostHeader = h.get("host")?.trim();

  const resolvedSiteId =
    (siteIdOverride && siteIdOverride.trim()) ||
    (siteIdHeader && siteIdHeader) ||
    siteIdFromHost(hostHeader) ||
    (process.env.SITE_ID ? process.env.SITE_ID.trim() : "") ||
    "trennschleifer-profi";

  const filePath = siteConfigPath(resolvedSiteId);

  if (!fs.existsSync(filePath)) {
    // Harte Fehlermeldung, damit du sofort siehst, welche siteId aufgelöst wurde.
    // (Hilft extrem beim Debuggen von Host-Routing.)
    throw new Error(
      `Konfigurationsfehler: config.json nicht gefunden für siteId="${resolvedSiteId}" unter ${filePath}`
    );
  }

  const cfg = readJsonFile(filePath);

  // Minimal absichern, damit siteId/Domain im Code verfügbar sind
  cfg.siteId = cfg.siteId ?? resolvedSiteId;

  return cfg;
}
