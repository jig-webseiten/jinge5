// 🔧 pirsch-server.ts
const API_BASE = process.env.PIRSCH_API_BASE ?? "https://api.pirsch.io";
const KEY = process.env.PIRSCH_ACCESS_KEY ?? "";

type Meta = Record<string, string | number | boolean | null | undefined>;

function mkSignal(ms: number) {
  try {
    const ac = new AbortController();
    setTimeout(() => ac.abort(), ms);
    return ac.signal;
  } catch {
    return undefined as any;
  }
}

export async function pirschEvent(
  name: string,
  meta?: Meta,
  ctx?: { req?: Request; url?: string; referrer?: string; ts?: string }
): Promise<void> {
  // SAFE: ohne Key niemals werfen
  if (!KEY) return;

  const body: any = { event_name: name, meta: meta ?? {} };
  if (ctx?.url) body.url = ctx.url;
  if (ctx?.referrer) body.referrer = ctx.referrer;

  try {
    // Header best-effort übernehmen (nie werfen)
    const h = ctx?.req?.headers;
    if (h) {
      const ip = h.get("x-forwarded-for") || undefined;
      const ua = h.get("user-agent") || undefined;
      const al = h.get("accept-language") || undefined;
      if (ip) body.ip = ip;
      if (ua) body.user_agent = ua;
      if (al) body.accept_language = al;
    }
  } catch { /* ignore */ }

  try {
    // Fire-and-forget, niemals Build/Runtime blockieren
    void fetch(`${API_BASE}/api/v1/event`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: mkSignal(1200),
    }).catch(() => {});
  } catch {
    // komplett schlucken
  }
}
