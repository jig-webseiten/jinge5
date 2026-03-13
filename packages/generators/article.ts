import { slugify } from "@jinge/utils/slug";

type Params = {
  asin: string;
  articleType?: "produkttest" | "bestof" | "info" | "kaufberatung";
  language?: "de" | "en" | "fr";
  siteId: string;
};

export async function generateArticle({
  asin,
  articleType = "produkttest",
  language = "de",
  siteId,
}: Params) {
  const title =
    articleType === "bestof"
      ? `Best-of zu ${asin}`
      : articleType === "kaufberatung"
      ? `Kaufberatung zu ${asin}`
      : articleType === "info"
      ? `Info-Artikel zu ${asin}`
      : `Produkttest ${asin}`;

  const category = "rasenpflege";
  const slug = `${slugify(title)}-${asin.toLowerCase()}`;

  const mdx = `---
title: "${title}"
description: "Automatisch generierter ${articleType}-Artikel (${language}) zu ${asin}"
category: "${category}"
slug: "${slug}"
authorId: "aut_anna"
createdAt: "${new Date().toISOString()}"
---

# ${title}

**Hinweis:** Dies ist ein Dummy-Artikel. Inhalte werden in späteren Schritten mit echten Produktdaten gefüllt.

## Kurzfazit
- Solide Basis
- Platzhaltertext – später ersetzen

## Nächste Schritte
- Amazon-Produktdaten anbinden
- Pros/Cons aus Produktmerkmalen generieren
`;

  return { category, slug, mdx };
}
