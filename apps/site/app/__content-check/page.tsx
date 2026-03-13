// apps/site/app/__content-check/page.tsx
export const runtime = "nodejs";        // wichtig: fs nur in Node.js
export const dynamic = "force-dynamic"; // kein Cache (nur Debug)

import fs from "node:fs";
import path from "node:path";

function resolveContentDir(siteId = process.env.SITE_ID ?? "garden-hero") {
  // zwei Kandidaten für Monorepo/Root
  const candidates = [
    path.resolve(process.cwd(), "apps", "site", "sites", siteId, "content"),
    path.resolve(process.cwd(), "sites", siteId, "content"),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  return { candidates, picked: found ?? candidates[0], exists: !!found };
}

export default async function Page() {
  const siteId = process.env.SITE_ID ?? "garden-hero";
  const cwd = process.cwd();
  const { candidates, picked, exists } = resolveContentDir(siteId);

  const byCat: Record<string, string[]> = {};
  let total = 0;

  if (exists) {
    const cats = fs
      .readdirSync(picked, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const cat of cats) {
      const dir = path.join(picked, cat);
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.toLowerCase().endsWith(".mdx"));
      byCat[cat] = files;
      total += files.length;
    }
  }

  const payload = {
    cwd,
    siteId,
    candidates,
    picked,
    exists,
    totalMdx: total,
    filesByCategory: byCat,
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>__content-check</h1>
      <pre>{JSON.stringify(payload, null, 2)}</pre>
    </main>
  );
}
