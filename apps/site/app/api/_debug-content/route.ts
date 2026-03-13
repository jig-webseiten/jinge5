import fs from "node:fs/promises";
import path from "node:path";
import { contentRoot } from "@/lib/path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const dir = contentRoot("garden-hero");
    let exists = false, list: string[] = [];
    try {
      const stat = await fs.stat(dir);
      exists = stat.isDirectory();
      if (exists) {
        // Nur erste Ebene/Kategorieordner zeigen
        const entries = await fs.readdir(dir, { withFileTypes: true });
        list = entries.map(e => (e.isDirectory() ? `[DIR] ` : ``) + e.name);
      }
    } catch {}

    return new Response(
      JSON.stringify({ cwd: process.cwd(), dir, exists, list }, null, 2),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(String(e?.stack || e), { status: 500 });
  }
}
