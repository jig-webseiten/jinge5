// apps/site/app/api/_content-check/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import * as fsSync from "node:fs";
import { contentRoot } from "@/lib/path";

export async function GET() {
  try {
    const siteId = process.env.SITE_ID ?? "garden-hero";
    const dir = contentRoot(siteId);

    const exists = fsSync.existsSync(dir);
    const tree: Record<string, string[]> = {};

    if (exists) {
      const cats = await fs.readdir(dir);
      for (const c of cats) {
        const p = path.join(dir, c);
        if (fsSync.statSync(p).isDirectory()) {
          const files = await fs.readdir(p);
          tree[c] = files.filter(f => f.toLowerCase().endsWith(".mdx"));
        }
      }
    }

    return NextResponse.json({ siteId, dir, exists, tree }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
