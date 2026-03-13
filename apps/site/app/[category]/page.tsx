// apps/site/app/[category]/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { contentRoot } from "@/lib/path";

/* ---------- helpers ---------- */

// Cleaner: Mojibake + HTML-Entities reparieren
const cleanMeta = (s: any) => {
  const v = String(s ?? "");
  const mojibakeFixed = v
    .replace(/Ã¼/g, "ü")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã¤/g, "ä")
    .replace(/Ãœ/g, "Ü")
    .replace(/Ã–/g, "Ö")
    .replace(/Ã„/g, "Ä")
    .replace(/ÃŸ/g, "ß")
    .replace(/â€“/g, "–")
    .replace(/â€”/g, "—")
    .replace(/â€ž/g, "„")
    .replace(/â€œ/g, "“")
    .replace(/â€�/g, "”")
    .replace(/â€˜/g, "‘")
    .replace(/â€™/g, "’")
    .replace(/â€¢/g, "•")
    .replace(/â€¦/g, "…")
    .replace(/\s+/g, " ")
    .trim();
  return mojibakeFixed
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "“")
    .replace(/&#39;|&apos;/g, "’")
    .replace(/&nbsp;/g, " ");
};

// matter() robust einlesen
const safeMatter = (raw: string) => {
  try {
    return matter(raw);
  } catch {
    return { data: {}, content: raw } as {
      data: Record<string, unknown>;
      content: string;
    };
  }
};

function getRequestSiteId(): string {
  const h = headers();
  const siteId = (h.get("x-site-id") ?? "").trim();
  return siteId || process.env.SITE_ID || "garden-hero";
}

function getBaseUrl(): string {
  const h = headers();
  const host =
    h.get("x-forwarded-host") ??
    h.get("host") ??
    process.env.SITE_URL?.replace(/^https?:\/\//, "") ??
    "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/* ---------- SEO ---------- */
export async function generateMetadata({
  params,
}: {
  params: { category: string };
}): Promise<Metadata> {
  const siteId = getRequestSiteId();
  const siteUrl = getBaseUrl();

  const contentDir = contentRoot(siteId);
  const catSlug = params.category;

  const introPath = path.join(contentDir, "_category", `${catSlug}.mdx`);

  let title = catSlug;
  let description: string | undefined;

  if (fs.existsSync(introPath)) {
    const introRaw = fs.readFileSync(introPath, "utf8");
    const intro = safeMatter(introRaw);
    title = cleanMeta((intro.data as any)?.title) || title;
    description =
      (intro.data as any)?.description
        ? cleanMeta((intro.data as any).description)
        : intro.content.trim() || undefined;
  }

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: `/${catSlug}` },
    openGraph: {
      type: "website",
      url: `${siteUrl}/${catSlug}`,
      title,
      description,
    },
  };
}

/* ---------- Page ---------- */
type PostCard = {
  slug: string;
  title: string;
  description?: string;
  createdAt?: string;
  heroImage?: string;
  heroImageAlt?: string;
};

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const siteId = getRequestSiteId();
  const contentDir = contentRoot(siteId);
  const catSlug = params.category;

  // Intro
  const introPath = path.join(contentDir, "_category", `${catSlug}.mdx`);
  let introTitle = catSlug;
  let introDesc: string | undefined;

  if (fs.existsSync(introPath)) {
    const introRaw = fs.readFileSync(introPath, "utf8");
    const intro = safeMatter(introRaw);
    introTitle = cleanMeta((intro.data as any)?.title) || introTitle;
    introDesc =
      (intro.data as any)?.description
        ? cleanMeta((intro.data as any).description)
        : intro.content.trim() || undefined;
  }

  // Artikel der Kategorie
  const catDir = path.join(contentDir, catSlug);
  const posts: PostCard[] = [];

  if (fs.existsSync(catDir)) {
    const files = fs
      .readdirSync(catDir)
      .filter((f) => f.toLowerCase().endsWith(".mdx"));

    for (const file of files) {
      const raw = fs.readFileSync(path.join(catDir, file), "utf8");
      const { data } = safeMatter(raw);

      posts.push({
        slug: file.replace(/\.mdx$/i, ""),
        title: cleanMeta((data as any)?.title) || file,
        description: (data as any)?.description
          ? cleanMeta((data as any).description)
          : undefined,
        createdAt: (data as any)?.createdAt ?? (data as any)?.date ?? undefined,
        heroImage: (data as any)?.heroImage ?? undefined,
        heroImageAlt: (data as any)?.heroImageAlt
          ? cleanMeta((data as any).heroImageAlt)
          : (data as any)?.title ?? undefined,
      });
    }
  }

  posts.sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? "")
  );

  return (
    <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 16px" }}>
      <nav
        aria-label="breadcrumb"
        style={{ fontSize: ".9rem", marginBottom: ".5rem", opacity: 0.8 }}
      >
        <Link href="/">Start</Link> <span aria-hidden>›</span>{" "}
        <span>{catSlug}</span>
      </nav>

      <header style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: "0 0 .25rem", fontSize: "2rem", lineHeight: 1.2 }}>
          {cleanMeta(introTitle)}
        </h1>
        {introDesc && (
          <p style={{ margin: 0, opacity: 0.9 }}>
            {cleanMeta(introDesc)}
          </p>
        )}
      </header>

      {posts.length === 0 ? (
        <p>Keine Inhalte in dieser Kategorie.</p>
      ) : (
        <ul
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
            listStyle: "none",
            padding: 0,
          }}
        >
          {posts.map((p) => (
            <li
              key={p.slug}
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: 12,
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: ".5rem",
                background: "#fff",
                boxShadow: "0 1px 0 rgba(0,0,0,.02)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.05rem", lineHeight: 1.35 }}>
                {cleanMeta(p.title)}
              </h3>

              {p.heroImage && (
                <Link
                  href={`/${catSlug}/${p.slug}`}
                  style={{
                    display: "block",
                    lineHeight: 0,
                    position: "relative",
                    width: "100%",
                    aspectRatio: "21 / 9",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={p.heroImage}
                    alt={cleanMeta(p.heroImageAlt ?? p.title)}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    style={{ objectFit: "cover" }}
                  />
                </Link>
              )}

              {p.description && (
                <p style={{ opacity: 0.85, margin: 0 }}>
                  {cleanMeta(p.description)}
                </p>
              )}

              <p
                style={{
                  fontSize: ".85rem",
                  opacity: 0.7,
                  margin: ".25rem 0 .5rem",
                }}
              >
                {catSlug} • {p.createdAt?.slice(0, 10) ?? "—"}
              </p>

              <div style={{ marginTop: "auto" }}>
                <Link href={`/${catSlug}/${p.slug}`}>
                  Zum Artikel →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
