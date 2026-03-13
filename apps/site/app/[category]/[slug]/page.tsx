// apps/site/app/[category]/[slug]/page.tsx
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { headers } from "next/headers";
import type { Metadata } from "next";

import { renderMarkdownToHtml } from "@/lib/markdown";
import { type Author } from "@/components/AuthorBox";
import { ArticleTemplateResolver } from "@/components/article-templates";
import { contentRoot } from "@/lib/path";
import { normalizePageType } from "@/lib/page-types";

/* ---------- helpers ---------- */

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
  const proto = h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function readSiteConfig(siteDir: string) {
  const p = path.join(siteDir, "config.json");
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return { authors: [] as Author[] };
  }
}

function resolveMdxPath(contentDir: string, category: string, slug: string): string {
  const dir = path.join(contentDir, category);
  let filePath = path.join(dir, `${slug}.mdx`);

  if (fs.existsSync(filePath)) return filePath;

  // Robust: Windows vs Linux case / oddities
  const wanted = `${slug}.mdx`.toLowerCase();
  if (fs.existsSync(dir)) {
    const hit = fs.readdirSync(dir).find((f) => f.toLowerCase() === wanted);
    if (hit) return path.join(dir, hit);
  }

  return filePath; // fallback for logging/error message
}

/* ---------- SEO: metadata ---------- */
export async function generateMetadata({
  params,
}: {
  params: { category: string; slug: string };
}): Promise<Metadata> {
  const siteId = getRequestSiteId();
  const baseUrl = getBaseUrl();

  const contentDir = contentRoot(siteId);
  const filePath = resolveMdxPath(contentDir, params.category, params.slug);

  console.log("[Article.generateMetadata] resolved:", { siteId, filePath, baseUrl });

  if (!fs.existsSync(filePath)) {
    return {
      title: "Nicht gefunden",
      description: "Der angeforderte Artikel existiert nicht.",
      alternates: { canonical: `/${params.category}/${params.slug}` },
      openGraph: {
        type: "article",
        url: `${baseUrl}/${params.category}/${params.slug}`,
        title: "Nicht gefunden",
        description: "Der angeforderte Artikel existiert nicht.",
      },
    };
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);

  const title = (parsed.data.title as string) || `${params.category}/${params.slug}`;
  const description = (parsed.data.description as string) || "Artikel";
  const heroImage = (parsed.data.heroImage as string) || undefined;
  const createdAt = (parsed.data.createdAt as string) || undefined;

  const canonical = `/${params.category}/${params.slug}`;

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: `${baseUrl}${canonical}`,
      title,
      description,
      images: heroImage ? [{ url: heroImage }] : undefined,
    },
    other: createdAt ? { "article:published_time": createdAt } : undefined,
  };
}

/* ---------- page ---------- */
export default async function ArticlePage({
  params,
}: {
  params: { category: string; slug: string };
}) {
  const siteId = getRequestSiteId();

  const contentDir = contentRoot(siteId);
  const siteDir = path.join(contentDir, ".."); // apps/site/sites/<siteId>
  const filePath = resolveMdxPath(contentDir, params.category, params.slug);

  console.log("[ArticlePage] resolved:", { siteId, filePath });

  if (!fs.existsSync(filePath)) {
    return (
      <article className="content">
        <h1>Nicht gefunden</h1>
        <p>Die Datei gibt es nicht: {params.category}/{params.slug}.mdx</p>
        <style
          dangerouslySetInnerHTML={{
            __html: `.content a { text-decoration: underline; } .content a:hover { text-decoration: underline; }`,
          }}
        />
      </article>
    );
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = matter(raw);
  const pageType = normalizePageType(parsed.data.pageType);

  const cfg = readSiteConfig(siteDir);
  const authorId = (parsed.data.authorId as string) ?? "";
  const authorFromCfg: Author | undefined = cfg.authors?.find((a: Author) => a.id === authorId);

  const author: Author = {
    id: authorFromCfg?.id || authorId || "aut_unk",
    name: (parsed.data.authorName as string) || authorFromCfg?.name || "Autor",
    bio: authorFromCfg?.bio || "",
    avatarUrl:
      authorFromCfg?.avatarUrl && authorFromCfg.avatarUrl.trim().length > 0
        ? authorFromCfg.avatarUrl
        : undefined,
  };

  const html = renderMarkdownToHtml(parsed.content);

  return (
    <ArticleTemplateResolver
      pageType={pageType}
      html={html}
      category={parsed.data.category ? String(parsed.data.category) : undefined}
      description={parsed.data.description ? String(parsed.data.description) : undefined}
      author={author}
    />
  );
}