// apps/site/lib/table/schema-helpers.ts
import { TABLE_SCHEMA } from "./schema";

export function normalizeSpecKeys(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};

  for (const [rawKey, v] of Object.entries(input)) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;

    const lk = rawKey.toLowerCase();
    const canon = (TABLE_SCHEMA.keyAliases[lk] || lk).toLowerCase();

    // Policy: niemals package/shipping weight als weight behandeln
    if (TABLE_SCHEMA.policies.weight.forbiddenSourceKeys.includes(canon)) continue;

    // --- BUGFIX: "Holz" wird manchmal als Brennstoff geliefert -> als Material behandeln
    // (z.B. durch Heuristiken/Specs, obwohl es eigentlich das Material meint)
    const vLower = s.toLowerCase();
    if (canon === "brennstoff" && (vLower === "holz" || vLower === "wood")) {
      if (out["material"] == null) out["material"] = s;
      continue; // niemals als Brennstoff übernehmen
    }

    if (out[canon] == null) out[canon] = s;
  }

  return out;
}

export function filterSpecForTable(spec: Record<string, unknown>) {
  const allow = new Set(TABLE_SCHEMA.allowKeys);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(spec)) {
    if (!allow.has(k)) continue;
    out[k] = v;
  }
  return out;
}

export function labelHeader(key: string, language: string) {
  const base = (language || "de").toLowerCase().split("-")[0];
  const i18n = TABLE_SCHEMA.labels.i18n?.[base];
  return i18n?.[key] || TABLE_SCHEMA.labels.de[key] || key;
}

/** Käuferrelevante Reihenfolge: boosts (keyword) + buyerCore */
export function preferredKeysForKeyword(keyword: string) {
  const kw = (keyword || "").toLowerCase();
  let boost: readonly string[] = [];
  for (const k of Object.keys(TABLE_SCHEMA.priority.boosts)) {
    if (kw.includes(k)) {
      boost = TABLE_SCHEMA.priority.boosts[k];
      break;
    }
  }
  // unique, stable
  return Array.from(new Set([...boost, ...TABLE_SCHEMA.priority.buyerCore]));
}
