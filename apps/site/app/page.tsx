// apps/site/app/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";
import { headers } from "next/headers";
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import matter from "gray-matter";
import Image from "next/image";
import { contentRoot } from "@/lib/path";

// Schonender Cleaner: nur Mojibake reparieren (keine Entity-Dekodierung hier)
const cleanMeta = (s: any) => {
  const v = String(s ?? "");
  return v
    .replace(/Ã¼/g, "ü").replace(/Ã¶/g, "ö").replace(/Ã¤/g, "ä")
    .replace(/Ãœ/g, "Ü").replace(/Ã–/g, "Ö").replace(/Ã„/g, "Ä")
    .replace(/ÃŸ/g, "ß").replace(/â€“/g, "–").replace(/â€”/g, "—")
    .replace(/â€ž/g, "„").replace(/â€œ/g, "“").replace(/â€�/g, "”")
    .replace(/â€˜/g, "‘").replace(/â€™/g, "’").replace(/â€¢/g, "•").replace(/â€¦/g, "…")
    .replace(/\s+/g, " ")
    .trim();
};

// Robust: matter() im Try/Catch, damit kaputtes Frontmatter nicht crasht
const safeMatter = (raw: string) => {
  try {
    return matter(raw);
  } catch {
    return { data: {}, content: raw } as { data: Record<string, unknown>; content: string };
  }
};

type ListItem = {
  category: string;
  slug: string;
  title: string;
  description?: string;
  createdAt?: string;
  heroImage?: string;
  heroImageAlt?: string;
};

export default async function Home() {
  const siteId = headers().get("x-site-id") ?? process.env.SITE_ID ?? "garden-hero";


  // --- Pfad robust ermitteln: erst contentRoot(), dann Kandidaten testen ---
  const primary = contentRoot(siteId);
  const candidates = [
    primary,
    path.resolve(process.cwd(), "apps", "site", "sites", siteId, "content"),
    path.resolve(process.cwd(), "sites", siteId, "content"),
  ];
  const contentDir = candidates.find((p) => fs.existsSync(p)) ?? primary;

  // Präzise Logs für Vercel Function Logs
  console.log("[home:resolve]", {
    cwd: process.cwd(),
    siteId,
    candidates,
    picked: contentDir,
    exists: fs.existsSync(contentDir),
  });

  const items: ListItem[] = [];
  const tried: string[] = candidates;

  if (fs.existsSync(contentDir)) {
    // Kategorien sauber ermitteln
    const categories = fs
      .readdirSync(contentDir)
      .filter((d) => {
        const p = path.join(contentDir, d);
        return fs.existsSync(p) && fs.statSync(p).isDirectory();
      });

    console.log("[home:cats]", categories);

    for (const category of categories) {
      const p = path.join(contentDir, category);
      const files = fs.readdirSync(p).filter((f) => f.toLowerCase().endsWith(".mdx"));
      console.log("[home:list]", { category, count: files.length, files });

      for (const file of files) {
        const full = path.join(p, file);
        const raw = fs.readFileSync(full, "utf8");
        const { data } = safeMatter(raw);

        items.push({
          category,
          slug: file.replace(/\.mdx$/i, ""),
          title: cleanMeta((data as any)?.title) || `${category}/${file}`,
          description: (data as any)?.description ? cleanMeta((data as any).description) : undefined,
          createdAt: (data as any)?.createdAt ?? (data as any)?.date ?? undefined,
          heroImage: (data as any)?.heroImage ?? undefined,
          heroImageAlt: (data as any)?.heroImageAlt
            ? cleanMeta((data as any).heroImageAlt)
            : (data as any)?.title ?? undefined,
        });
      }
    }
  }

  // Neueste zuerst; robust auch wenn createdAt/date fehlt
  items.sort((a, b) => {
    const aa = a.createdAt ?? "";
    const bb = b.createdAt ?? "";
    return bb.localeCompare(aa);
  });

  // Log kurz vor dem Rendern: Was bleibt übrig?
  console.log("[home:afterFilter]", { total: items.length, sample: items[0]?.slug ?? null });

  return (
    <section style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 16px" }}>
      <h1 style={{ marginBottom: "1rem", fontSize: "2rem", fontWeight: "bold" }}>Die neusten Artikel</h1>
      {items.length === 0 ? (
        <>
          <p>Keine Artikel gefunden.</p>
          <details>
            <summary>Debug</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify({ siteId, tried }, null, 2)}
            </pre>
          </details>
          <p>
            Lege eine <code>.mdx</code>-Datei unter{" "}
            <code>apps/site/sites/{siteId}/content/&lt;kategorie&gt;/</code> an.
          </p>
        </>
      ) : (
        <ul
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
            gap: "1rem",
            listStyle: "none",
            padding: 0,
          }}
        >
          {items.map((it) => (
            <li
              key={`${it.category}/${it.slug}`}
              style={{
                border: "1px solid #e5e5e5",
                borderRadius: "12px",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                gap: ".5rem",
                background: "#fff",
                boxShadow: "0 1px 0 rgba(0,0,0,.02)",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.1rem", lineHeight: 1.25 }}>{it.title}</h3>

              {it.heroImage && (
                <Link
                  href={`/${it.category}/${it.slug}`}
                  className="card-thumb"
                  style={{
                    display: "block",
                    lineHeight: 0,
                    position: "relative",
                    width: "100%",
                    // 🔄 Banner-Format passend zur Header-Bildgenerierung
                    aspectRatio: "4 / 3",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={it.heroImage || "/placeholder.png"}
                    alt={it.heroImageAlt ?? it.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    priority={false}
                    style={{ objectFit: "cover", objectPosition: "center" }}
                  />

                  {/* Overlay: zentrierter Titel, nicht abschneidbar */}
                  <div
					  style={{
						position: "absolute",
						inset: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						padding: "1rem",
						textAlign: "center",
						pointerEvents: "none",
					  }}
					>
					  <span
						style={{
						  display: "inline-block",
						  maxWidth: "90%",
						  fontSize: "1rem",
						  fontWeight: 700,
						  lineHeight: 1.2,
						  color: "#ffffff",
						  padding: "0.75rem 1.25rem",
						  borderRadius: "10px",
						  background: "rgba(0,0,0,0.32)",
						  backdropFilter: "blur(6px)",
						  textShadow: "0 2px 6px rgba(0,0,0,0.35)",
						}}
					  >
						{it.title}
					  </span>
					</div>

                </Link>
              )}

              {it.description && (
                <p style={{ opacity: 0.85, margin: 0 }}>
                  {it.description}
                </p>
              )}

              <p style={{ fontSize: ".85rem", opacity: 0.7, margin: ".25rem 0 .5rem" }}>
                {it.category} • {it.createdAt?.slice(0, 10) ?? "—"}
              </p>

              <div style={{ marginTop: "auto" }}>
                <Link href={`/${it.category}/${it.slug}`}>Zum Artikel →</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
