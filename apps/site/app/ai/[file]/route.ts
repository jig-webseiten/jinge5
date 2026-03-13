import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

export async function GET(
  _req: Request,
  { params }: { params: { file: string } }
) {
  const siteId = process.env.SITE_ID || "garden-hero";
  const projectRoot = process.cwd();

  // Nur PNGs zulassen (Sicherheit & Einfachheit)
  const file = String(params.file || "");
  if (!/^[a-z0-9\-_.]+\.png$/i.test(file)) return NextResponse.json({ ok: false }, { status: 400 });

  const abs = path.join(projectRoot, "sites", siteId, "content", "_ai", file);
  try {
    const buf = await fs.readFile(abs);
    return new NextResponse(buf, { headers: { "content-type": "image/png" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
