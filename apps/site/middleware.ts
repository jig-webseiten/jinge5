// apps/site/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Multi-Site Routing per Hostname.
 *
 * Ziel:
 * - Custom Domains (z.B. hof-und-kuh.de) -> feste siteId
 * - Subdomains (z.B. hof-und-kuh.garden-hero.net) -> siteId aus Subdomain
 * - Local Dev (z.B. hof-und-kuh.local) -> siteId aus Subdomain
 *
 * Aktuelles Projektverhalten:
 * - Wir setzen x-site-id Header und lassen das Routing in deinem App-Code entscheiden.
 *   (Kein Rewrite auf /s/[siteId] in dieser Version.)
 */

const ROOT_DOMAIN = "terre-verte.fr";

/** Explizite Zuordnung: Custom Domain -> siteId */
const CUSTOM_DOMAIN_MAP: Record<string, string> = {
  // --- Hof & Kuh ---
 
  
  "terre-verte.fr": "terre-verte",
  "www.terre-verte.fr": "terre-verte",
 
  
  // Optional: explizite Subdomains (hilft beim Debuggen/Domain-UI)
 
	"terre-verte.garden-hero.net": "terre-verte",
	
	};

function normalizeHost(host: string): string {
  return host.toLowerCase().split(":")[0].trim();
}

function extractSiteIdFromHost(host: string): string | null {
  const h = normalizeHost(host);
  if (!h) return null;

  // 1) Custom Domains zuerst (hof-und-kuh.de etc.)
  const mapped = CUSTOM_DOMAIN_MAP[h];
  if (mapped) return mapped;

  // 2) Local Dev: <siteId>.local
  if (h.endsWith(".local")) {
    const sub = h.slice(0, -".local".length);
    if (!sub || sub === "www") return null;
    return sub;
  }

  // 3) Wildcard-Subdomains: <siteId>.garden-hero.net
  if (h === ROOT_DOMAIN) {
    return CUSTOM_DOMAIN_MAP[ROOT_DOMAIN] ?? "garden-hero";
  }
  if (h.endsWith(`.${ROOT_DOMAIN}`)) {
    const left = h.slice(0, -(ROOT_DOMAIN.length + 1)); // Teil links vom Root
    if (!left || left === "www") {
      return CUSTOM_DOMAIN_MAP[ROOT_DOMAIN] ?? "garden-hero";
    }
    // left kann z.B. "hof-und-kuh" sein oder "foo.bar" – wir nehmen den ganzen left-Teil.
    return left;
  }

  // 4) Preview/Default: <something>.vercel.app -> siteId = erstes Label
  if (h.endsWith(".vercel.app")) {
    const parts = h.split(".");
    if (parts.length >= 3 && parts[0]) return parts[0];
  }

  return null;
}

 export function middleware(req: NextRequest) {
   const pathname = req.nextUrl.pathname;
 
   // ✅ Outbound-Redirect & API dürfen nicht in Multi-Site-Headerlogik laufen
   if (pathname === "/out" || pathname.startsWith("/out/")) {
     return NextResponse.next();
   }
   if (pathname.startsWith("/api/")) {
     return NextResponse.next();
   }

   // IMPORTANT: Custom Domains kommen auf Vercel häufig über x-forwarded-host
   const host =
     req.headers.get("x-forwarded-host") ??
     req.headers.get("host") ??
     "";


  const resolvedFromHost = extractSiteIdFromHost(host);

  // Default: wenn nicht auflösbar, auf garden-hero fallen
  const siteId = resolvedFromHost;

  // Header für den Rest der App (Server Components / API / SSR)
  const requestHeaders = new Headers(req.headers);
  if (siteId) {
  requestHeaders.set("x-site-id", siteId);
}
  requestHeaders.set("x-site-host", normalizeHost(host));

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  res.headers.set("x-debug-site-id", siteId);
console.log("[mw] x-forwarded-host:", req.headers.get("x-forwarded-host"));
console.log("[mw] host:", req.headers.get("host"));
console.log("[mw] used host:", host);
console.log("[mw] resolvedFromHost:", resolvedFromHost);
console.log("[mw] siteId:", siteId);

  return res;
}


export const config = {
  // Exclude: Next internals, assets, typische öffentliche Dateien + out/api
  matcher: [
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|out(?:/|$)|api(?:/|$)|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)$).*)",
  ],
};

