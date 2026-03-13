// apps/site/app/layout.tsx
import "@/styles/globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./kb.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import Script from "next/script";
import { SiteNav } from "@/components/SiteNav";
import { AmazonClickTracker } from "@/components/AmazonClickTracker";
import { getSiteConfig } from "@/lib/site-config"; // ← wichtig

export const dynamic = "force-dynamic";
export const revalidate = 0;

const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap" });

// Basis-URL
const siteUrl = process.env.SITE_URL ?? "http://localhost:3000";

// Pirsch
const pirschCode = process.env.NEXT_PUBLIC_PIRSCH_CODE ?? "";
const pirschExclude = "/api/.*, /preview/.*";

const pirschDevHost = (process.env.NEXT_PUBLIC_PIRSCH_DEV_HOST ?? "").trim();

// Debug-Flag
const DEBUG = process.env.NODE_ENV !== "production";

// FIX: Multi-Tenant Metadata muss request-basiert sein
export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await getSiteConfig();
  console.log("[site]", siteConfig.siteId, siteConfig.domain);

  const siteTitle =
  siteConfig.prompts?.brandName ??
  siteConfig.title ??
  "Jinge Site";
console.log("[layout] brandName =", siteConfig.prompts?.brandName);


  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteTitle,
      template: `%s | ${siteTitle}`,
    },
    description:
      siteConfig.description ??
      "Unabhängige Kaufberatungen, Vergleiche & Empfehlungen.",
    robots: { index: true, follow: true },
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: siteTitle,
      url: siteUrl,
      locale: "de_DE",
    },
  };
};


export default async function RootLayout({ children }: { children: ReactNode }) {
  const siteConfig = await getSiteConfig();
  const logoSrc = siteConfig.logoUrl as string;
  const siteTitle =   siteConfig.prompts?.brandName ??
  siteConfig.title ??
  "Jinge Site";
  const categories = siteConfig.categories ?? [];

	return (
	  <html
		lang="de"
		style={
		  {
			["--brand-primary" as any]: siteConfig.branding?.primary ?? "#111827",
			["--brand-secondary" as any]: siteConfig.branding?.secondary ?? "#ffffff",
		  } as React.CSSProperties
		}
	  >

      <head>
        <meta charSet="utf-8" />

        {/* Debug im Dev-Build */}
        {DEBUG && pirschDevHost && (
          <meta name="x-pirsch-dev-host" content={pirschDevHost} />
        )}

        {/* Pirsch Pageview */}
        {pirschCode && (
          <Script
            id="pianjs"
            src="https://api.pirsch.io/pa.js"
            strategy="afterInteractive"
            defer
            data-code={pirschCode}
            data-exclude={pirschExclude}
            {...(pirschDevHost ? { "data-dev": pirschDevHost } : {})}
          />
        )}

        {/* Debug-Log */}
        {pirschCode && (
          <Script id="pirsch-debug" strategy="afterInteractive">
            {`
              console.log("[Pirsch] Init script running. Code prefix:", "${pirschCode.slice(
                0,
                6
              )}");
            `}
          </Script>
        )}

        {/* Pirsch Events */}
        {pirschCode && (
          <Script id="pirsch-events" strategy="afterInteractive">
            {`
              (function () {
                function initPirschEvents(retries) {
                  if (typeof window === "undefined") return;
                  if (typeof window.pirsch === "undefined") {
                    if (retries > 0) {
                      console.log("[Pirsch] window.pirsch not ready, retry...", retries);
                      setTimeout(function () { initPirschEvents(retries - 1); }, 200);
                    } else {
                      console.warn("[Pirsch] window.pirsch not available after retries.");
                    }
                    return;
                  }

                  console.log("[Pirsch] Event binding active.");

                  document.addEventListener("click", function (e) {
                    var target = e.target;
                    if (!target || !target.closest) return;

                    var link = target.closest("a[data-pirsch-event]");
                    if (!link) return;

                    var eventName = link.getAttribute("data-pirsch-event") || "Click";
                    var meta = {};

                    for (var i = 0; i < link.attributes.length; i++) {
                      var attr = link.attributes[i];
                      if (
                        attr &&
                        attr.name &&
                        attr.name.indexOf("data-pirsch-meta-") === 0 &&
                        attr.value
                      ) {
                        var key = attr.name.substring("data-pirsch-meta-".length);
                        meta[key] = attr.value;
                      }
                    }

                    console.log("[Pirsch] Sending event:", eventName, meta);

                    try {
                      window.pirsch(eventName, { meta: meta });
                    } catch (err) {
                      console.error("[Pirsch] event error", err);
                    }
                  });
                }

                initPirschEvents(30);
              })();
            `}
          </Script>
        )}
      </head>

			<body
			  className={inter.className}
			  style={{ backgroundColor: "var(--brand-secondary)" }}
			>

<header
  role="banner"
  aria-label="Seitenkopf"
  style={{
    backgroundColor: "var(--brand-primary)",
    boxShadow: "0 1px 0 rgba(0,0,0,0.12)",
  }}
>
  <nav
    role="navigation"
    aria-label="Hauptnavigation"
    className="site-nav"
    style={{
      backgroundColor: "var(--brand-primary)",
      display: "flex",
      alignItems: "center",
      gap: "1.25rem",
      padding: "0.15rem 1rem", 
    }}
  >
    {/* BRAND + LOGO */}
    <a
      href="/"
      className="brand"
      style={{
        display: "flex",
        alignItems: "center",
		lineHeight: 1,  
        gap: "0.5rem",
        fontWeight: 600,
        color: "#fff",
        textDecoration: "none",
      }}
    >
      <img
        src={logoSrc}
        alt={`${siteTitle} Logo`}
        width={84}
        height={84}
        style={{ display: "block" }}
      />
      <span
  style={{
    fontSize: "1.35rem",   // 👈 HIER größer
    lineHeight: 1.1,
    whiteSpace: "nowrap",
  }}
>
  {siteTitle}
</span>
    </a>

    {/* Spacer */}
    <div style={{ flexGrow: 1 }} />

    {/* Kategorien */}
    {categories.map((cat) => (
      <a
        key={cat.id}
        href={`/${cat.slug}`}
        style={{
          color: "rgba(255,255,255,0.9)",
          textDecoration: "none",
          padding: "6px 4px",
          fontWeight: 500,
          borderBottom: "2px solid transparent",
        }}
      >
        {cat.title}
      </a>
    ))}

    {/* Autoren */}
    <a
      href="/about-authors"
      style={{
        color: "rgba(255,255,255,0.9)",
        textDecoration: "none",
        padding: "6px 4px",
        fontWeight: 500,
        borderBottom: "2px solid transparent",
      }}
    >
      Autoren
    </a>
  </nav>
</header>


        <main role="main" className="container">{children}</main>

        <footer role="contentinfo">
          © {new Date().getFullYear()} {siteTitle}
          {" · "}
          <a href="/impressum">Impressum</a>
          {" · "}
          <a href="/datenschutz">Datenschutz</a>
        </footer>
		<AmazonClickTracker />
		<Analytics />
      </body>
    </html>
  );
}
