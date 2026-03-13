import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const url = new URL(req.url);

  const target = url.searchParams.get("u");
  if (!target) {
    return NextResponse.json({ error: "Missing u" }, { status: 400 });
  }

  return NextResponse.redirect(decodeURIComponent(target), 302);
}
