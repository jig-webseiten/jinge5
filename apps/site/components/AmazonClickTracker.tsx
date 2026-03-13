"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";

export function AmazonClickTracker() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;

      const hrefRaw = a.getAttribute("href") || "";
      if (!hrefRaw) return;

      // Unterstützt relative und absolute Links
      let url: URL;
      try {
        url = new URL(hrefRaw, window.location.origin);
      } catch {
        return;
      }

      // Wir tracken nur deine Outbound-Redirects
      if (url.pathname !== "/out" && !url.pathname.startsWith("/out/")) return;

      const asin = url.searchParams.get("asin") || "";
      const from = url.searchParams.get("from") || "";

      track("amazon_click", {
        page: window.location.pathname, // Artikel, auf dem geklickt wurde
        from,                           // optional (falls vorhanden)
        asin,
        out: url.pathname,              // z.B. /out oder /out/kategorie/slug
      });
    };

    // capture=true: robust, auch wenn Buttons/Spans im <a> geklickt werden
    document.addEventListener("click", handler, { capture: true });
    return () => document.removeEventListener("click", handler, { capture: true } as any);
  }, []);

  return null;
}
