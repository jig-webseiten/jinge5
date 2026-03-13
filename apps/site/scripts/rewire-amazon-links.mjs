import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "apps/site");
const CONTENT_ROOT = path.join(ROOT, "sites");

// Domains erkennen
const AMAZON_DOMAINS = new Set([
  "www.amazon.de",
  "amazon.de",
  "www.amazon.fr",
  "amazon.fr",
  "www.amazon.it",
  "amazon.it",
  "www.amazon.es",
  "amazon.es",
]);

// Dateitypen, die wir anfassen
const EXT = new Set([".md", ".mdx", ".html"]);

// dp/ASIN oder gp/product/ASIN
const ASIN_RE =
  /https?:\/\/([^\/\s]+)\/(?:dp|gp\/product)\/([A-Z0-9]{10})([^"\s)]*)/gi;

function isAmazonHost(host) {
  return AMAZON_DOMAINS.has(String(host || "").toLowerCase());
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// from = Dateipfad relativ zu apps/site (für Analytics-Zuordnung)
function relFromFile(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  return "/" + rel;
}

let changedFiles = 0;
let changedLinks = 0;

const files = walk(CONTENT_ROOT).filter((f) => EXT.has(path.extname(f)));

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const from = relFromFile(file);

  let didChange = false;

  const next = raw.replace(ASIN_RE, (match, host, asin) => {
    if (!isAmazonHost(host)) return match;

    const target = match;
    const out = `/out?u=${encodeURIComponent(target)}&from=${encodeURIComponent(
      from
    )}&asin=${encodeURIComponent(asin)}`;

    didChange = true;
    changedLinks += 1;
    return out;
  });

  if (didChange) {
    fs.writeFileSync(file, next, "utf8");
    changedFiles += 1;
  }
}

console.log(
  `Done. Files changed: ${changedFiles}, Links rewritten: ${changedLinks}`
);
