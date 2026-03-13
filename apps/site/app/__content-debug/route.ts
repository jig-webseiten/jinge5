// app/__content-debug/route.ts
export const runtime = "nodejs";         // fs nur in Node.js, nicht Edge
export const dynamic = "force-dynamic";  // kein Cache

import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

function resolveContentDir(siteId = process.env.SITE_ID ?? "garden-hero") {
  const candidates = [
    path.resolve(process.cwd(), "apps", "site", "sites", siteId, "content"),
    path.resolve(process.cwd(), "sites", siteId, "content"),
  ];
  const found = candidates.find(p => fs.existsSync(p));
  return { candidates, picked: found ?? candidates[0], exists: !!found };
}

export async function GET() {
  const cwd = process.cwd();
  const siteId = process.env.SITE_ID ?? "garden-hero";
  const { candidates, picked, exists } = resolveContentDir(siteId);

  const byCat: Record<string, string[]> = {};
  let total = 0;

  if (exists) {
    const dirs = fs.readdirSync(picked, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const cat of dirs) {
      const dir = path.join(picked, cat);
      const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(".mdx"));
      byCat[cat] = files;
      total += files.length;
    }
  }

  return NextResponse.json({
    cwd,
    siteId,
    candidates,
    picked,
    exists,
    totalMdx: total,
    filesByCategory: byCat,
  });
}
