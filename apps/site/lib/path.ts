// apps/site/lib/path.ts
import path from "node:path";
import fs from "node:fs";

/**
 * Liefert den Content-Root für eine Site.
 * Prüft zuerst den neuen Ort (apps/site/sites/<id>/content),
 * fällt bei Nichtvorhandensein auf den alten Ort (../../sites/<id>/content) zurück.
 */
export function contentRoot(siteId: string) {
  // In Next/Vercel ist process.cwd() == <repo>/apps/site
  const NEW_PATH = path.join(process.cwd(), "sites", siteId, "content");
  if (fs.existsSync(NEW_PATH)) return NEW_PATH;

  const OLD_PATH = path.join(process.cwd(), "..", "..", "sites", siteId, "content");
  if (fs.existsSync(OLD_PATH)) return OLD_PATH;

  // standardisiere den Debug-Hinweis auf den neuen Pfad
  return NEW_PATH;
}
