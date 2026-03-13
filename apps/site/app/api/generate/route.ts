// apps/site/app/api/generate/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { normalizePageType } from "@/lib/page-types";

import * as fs from "node:fs";                // Sync-API: existsSync, readFileSync, mkdirSync, writeFileSync …
import * as fsp from "node:fs/promises";      // Async-API (falls du sie irgendwo brauchst)
import path from "node:path";
import { pirschEvent } from "@/lib/analytics/pirsch-server"; // FIX: serverseitige Events

import { contentRoot } from "@/lib/path";
import OpenAI from "openai";
import { paapiGetItems } from "@jinge/integrations/amazon.pa";

import { TABLE_SCHEMA } from "@/lib/table/schema";
import {
  normalizeSpecKeys,
  filterSpecForTable,
  labelHeader,
  preferredKeysForKeyword,
} from "@/lib/table/schema-helpers";


console.log("=== ROUTE INIT ===");
console.log("ENV AMAZON_PA_PARTNER_TAG:", process.env.AMAZON_PA_PARTNER_TAG);
console.log("ENV SITE_ID:", process.env.SITE_ID);

const DEBUG = process.env.DEBUG_GENERATE === "1";
//function dlog(...args: any[]) {
//  if (DEBUG) console.log("[/api/generate]", ...args);
//}
	/* ================== STRICT SITE CONFIG / CATEGORIES LOADER ================== */

	type SiteCategory = { id?: string; slug: string; title: string };
	type SiteConfig = {
	  siteId: string;
	  domain?: string;
	  defaultLanguage?: string;
	  affiliate?: any;
	  branding?: any;
	  authors?: any[];
	  categories: SiteCategory[];
	};
	

// NEU: Style aus Super-Config (config.json) lesen
function readStyleConfig(siteId: string) {
  try {
    // getSiteConfigStrict() lädt bereits die passende config.json
    const cfg = getSiteConfigStrict(req);
    const style = (cfg as any).style || {};
    console.log("[style.config] aus Super-Config geladen:", Object.keys(style));
    return style;
  } catch (err) {
    console.error("[style.config] Fehler beim Laden aus Super-Config:", err);
    return {};
  }
}

		// 🔧 renderKaufberatungMarkdown (Zeile ~3214)
	// Problem:
	//   Du hast bereits Code umgebaut, der `UI_STRINGS[...]` nutzt – aber `UI_STRINGS` existiert nicht.
	// Lösung:
	//   1) UI_STRINGS zentral definieren (für ALLE erlaubten Sprachen, STRICT: kein Fallback)
	//   2) In renderKaufberatungMarkdown: UI holen + throw wenn fehlt
	//
	// ✅ Copy/Paste 1/2: Ganz oben in route.ts einfügen (bei deinen Helpern, vor POST)

	// 🔧 UI_STRINGS / UiStrings
// Problem:
//   renderKaufberatungMarkdown nutzt zusätzlich UI.buyingCriteriaHeading / UI.prosConsHeading / UI.prosLabel / UI.consLabel / UI.conclusionHeading.
//   Dein UiStrings-Type + UI_STRINGS haben diese Keys noch nicht → TS/Runtime-Fehler.
// Lösung:
//   UiStrings erweitern + alle Sprachen um die 5 Keys ergänzen (minimal: per helper, damit du nicht 20 Sprachen doppelt pflegen musst).

// ✅ Copy/Paste: Ersetze DEINEN KOMPLETTEN BLOCK (type UiStrings + UI_STRINGS + getUiStrings) durch diesen:
type UiStrings = {
  linkLabel: string;
  imageLabel: string;
  ctaAmazon: string;

  tableHeading: string;
  productsInDetailHeading: string;
  bestForLabel: string;

  buyingCriteriaHeading: string;
  prosConsHeading: string;
  prosLabel: string;
  consLabel: string;

  faqHeading: string;
  conclusionHeading: string;
};

// Basis-Section-Labels: alle Sprachen vollständig (STRICT).
const UI_SECTIONS: Record<
  string,
  Pick<
    UiStrings,
    | "buyingCriteriaHeading"
    | "prosConsHeading"
    | "prosLabel"
    | "consLabel"
    | "faqHeading"
    | "conclusionHeading"
  >
> = {
  de: {
    buyingCriteriaHeading: "Kaufkriterien",
    prosConsHeading: "Vor- & Nachteile",
    prosLabel: "Vorteile",
    consLabel: "Nachteile",
    faqHeading: "FAQ",
    conclusionHeading: "Fazit & Empfehlung"
  },
  en: {
    buyingCriteriaHeading: "Buying criteria",
    prosConsHeading: "Pros & Cons",
    prosLabel: "Pros",
    consLabel: "Cons",
    faqHeading: "FAQ",
    conclusionHeading: "Conclusion & recommendation"
  },
  fr: {
    buyingCriteriaHeading: "Critères d'achat",
    prosConsHeading: "Avantages & Inconvénients",
    prosLabel: "Avantages",
    consLabel: "Inconvénients",
    faqHeading: "FAQ",
    conclusionHeading: "Conclusion & recommandation"
  },
  es: {
    buyingCriteriaHeading: "Criterios de compra",
    prosConsHeading: "Pros y contras",
    prosLabel: "Pros",
    consLabel: "Contras",
    faqHeading: "Preguntas frecuentes",
    conclusionHeading: "Conclusión y recomendación"
  },
  it: {
    buyingCriteriaHeading: "Criteri di acquisto",
    prosConsHeading: "Pro e contro",
    prosLabel: "Pro",
    consLabel: "Contro",
    faqHeading: "FAQ",
    conclusionHeading: "Conclusione e raccomandazione"
  },
  pt: {
    buyingCriteriaHeading: "Critérios de compra",
    prosConsHeading: "Prós e contras",
    prosLabel: "Prós",
    consLabel: "Contras",
    faqHeading: "FAQ",
    conclusionHeading: "Conclusão e recomendação"
  },
  nl: {
    buyingCriteriaHeading: "Koopcriteria",
    prosConsHeading: "Voor- en nadelen",
    prosLabel: "Voordelen",
    consLabel: "Nadelen",
    faqHeading: "FAQ",
    conclusionHeading: "Conclusie & aanbeveling"
  },
  pl: {
    buyingCriteriaHeading: "Kryteria zakupu",
    prosConsHeading: "Zalety i wady",
    prosLabel: "Zalety",
    consLabel: "Wady",
    faqHeading: "FAQ",
    conclusionHeading: "Wnioski i rekomendacja"
  },
  sv: {
    buyingCriteriaHeading: "Köpkriterier",
    prosConsHeading: "För- och nackdelar",
    prosLabel: "Fördelar",
    consLabel: "Nackdelar",
    faqHeading: "FAQ",
    conclusionHeading: "Slutsats och rekommendation"
  },
  da: {
    buyingCriteriaHeading: "Købskriterier",
    prosConsHeading: "Fordele og ulemper",
    prosLabel: "Fordele",
    consLabel: "Ulemper",
    faqHeading: "FAQ",
    conclusionHeading: "Konklusion og anbefaling"
  },
  no: {
    buyingCriteriaHeading: "Kjøpskriterier",
    prosConsHeading: "Fordeler og ulemper",
    prosLabel: "Fordeler",
    consLabel: "Ulemper",
    faqHeading: "FAQ",
    conclusionHeading: "Konklusjon og anbefaling"
  },
  fi: {
    buyingCriteriaHeading: "Ostokriteerit",
    prosConsHeading: "Plussat ja miinukset",
    prosLabel: "Plussat",
    consLabel: "Miinukset",
    faqHeading: "UKK",
    conclusionHeading: "Yhteenveto ja suositus"
  },
  cs: {
    buyingCriteriaHeading: "Kritéria nákupu",
    prosConsHeading: "Výhody a nevýhody",
    prosLabel: "Výhody",
    consLabel: "Nevýhody",
    faqHeading: "FAQ",
    conclusionHeading: "Závěr a doporučení"
  },
  hu: {
    buyingCriteriaHeading: "Vásárlási szempontok",
    prosConsHeading: "Előnyök és hátrányok",
    prosLabel: "Előnyök",
    consLabel: "Hátrányok",
    faqHeading: "GYIK",
    conclusionHeading: "Összegzés és ajánlás"
  },
  tr: {
    buyingCriteriaHeading: "Satın alma kriterleri",
    prosConsHeading: "Artılar ve eksiler",
    prosLabel: "Artılar",
    consLabel: "Eksiler",
    faqHeading: "SSS",
    conclusionHeading: "Sonuç ve öneri"
  },
  ja: {
    buyingCriteriaHeading: "購入基準",
    prosConsHeading: "メリット・デメリット",
    prosLabel: "メリット",
    consLabel: "デメリット",
    faqHeading: "よくある質問",
    conclusionHeading: "結論とおすすめ"
  },
  hi: {
    buyingCriteriaHeading: "खरीद मानदंड",
    prosConsHeading: "फायदे और नुकसान",
    prosLabel: "फायदे",
    consLabel: "नुकसान",
    faqHeading: "अक्सर पूछे जाने वाले प्रश्न",
    conclusionHeading: "निष्कर्ष और सिफारिश"
  },
  ar: {
    buyingCriteriaHeading: "معايير الشراء",
    prosConsHeading: "الإيجابيات والسلبيات",
    prosLabel: "الإيجابيات",
    consLabel: "السلبيات",
    faqHeading: "الأسئلة الشائعة",
    conclusionHeading: "الخلاصة والتوصية"
  },
  he: {
    buyingCriteriaHeading: "קריטריוני קנייה",
    prosConsHeading: "יתרונות וחסרונות",
    prosLabel: "יתרונות",
    consLabel: "חסרונות",
    faqHeading: "שאלות נפוצות",
    conclusionHeading: "סיכום והמלצה"
  },
  ko: {
    buyingCriteriaHeading: "구매 기준",
    prosConsHeading: "장단점",
    prosLabel: "장점",
    consLabel: "단점",
    faqHeading: "자주 묻는 질문",
    conclusionHeading: "결론 및 추천"
  },
  zh: {
    buyingCriteriaHeading: "购买要点",
    prosConsHeading: "优点与缺点",
    prosLabel: "优点",
    consLabel: "缺点",
    faqHeading: "常见问题",
    conclusionHeading: "结论与推荐"
  },
  ru: {
    buyingCriteriaHeading: "Критерии покупки",
    prosConsHeading: "Плюсы и минусы",
    prosLabel: "Плюсы",
    consLabel: "Минусы",
    faqHeading: "FAQ",
    conclusionHeading: "Итог и рекомендация"
  }
};

// Helper: merge per language (STRICT: wenn Sections fehlen → Error)
function withSections(
  lang: string,
  core: Omit<
    UiStrings,
    | "buyingCriteriaHeading"
    | "prosConsHeading"
    | "prosLabel"
    | "consLabel"
    | "faqHeading"
    | "conclusionHeading"
  >
): UiStrings {
  const l = String(lang).trim().toLowerCase();
  const sec = UI_SECTIONS[l];
  if (!sec) {
    throw new Error(`Konfigurationsfehler: UI_SECTIONS fehlen für Sprache "${l}".`);
  }
  return { ...core, ...sec };
}

const UI_STRINGS: Record<string, UiStrings> = {
  de: withSections("de", {
    linkLabel: "Link",
    imageLabel: "Bild",
    ctaAmazon: "Bei Amazon ansehen",
    tableHeading: "Ausführlicher Vergleich der 4 beliebtesten Produkte",
    productsInDetailHeading: "Unsere Empfehlungen im Detail",
    bestForLabel: "Geeignet für"
  }),
  en: withSections("en", {
    linkLabel: "Link",
    imageLabel: "Image",
    ctaAmazon: "View on Amazon",
    tableHeading: "Detailed comparison of the four products",
    productsInDetailHeading: "Products in detail",
    bestForLabel: "Best for"
  }),
  fr: withSections("fr", {
    linkLabel: "Lien",
    imageLabel: "Image",
    ctaAmazon: "Voir sur Amazon",
    tableHeading: "Comparatif détaillé des quatre produits",
    productsInDetailHeading: "Produits en détail",
    bestForLabel: "Idéal pour"
  }),
  es: withSections("es", {
    linkLabel: "Enlace",
    imageLabel: "Imagen",
    ctaAmazon: "Ver en Amazon",
    tableHeading: "Comparación detallada de los cuatro productos",
    productsInDetailHeading: "Productos en detalle",
    bestForLabel: "Ideal para"
  }),
  it: withSections("it", {
    linkLabel: "Link",
    imageLabel: "Immagine",
    ctaAmazon: "Vedi su Amazon",
    tableHeading: "Confronto dettagliato dei quattro prodotti",
    productsInDetailHeading: "Prodotti in dettaglio",
    bestForLabel: "Ideale per"
  }),
  pt: withSections("pt", {
    linkLabel: "Link",
    imageLabel: "Imagem",
    ctaAmazon: "Ver na Amazon",
    tableHeading: "Comparação detalhada dos quatro produtos",
    productsInDetailHeading: "Produtos em detalhe",
    bestForLabel: "Ideal para"
  }),
  nl: withSections("nl", {
    linkLabel: "Link",
    imageLabel: "Afbeelding",
    ctaAmazon: "Bekijk op Amazon",
    tableHeading: "Gedetailleerde vergelijking van de vier producten",
    productsInDetailHeading: "Producten in detail",
    bestForLabel: "Geschikt voor"
  }),
  pl: withSections("pl", {
    linkLabel: "Link",
    imageLabel: "Obraz",
    ctaAmazon: "Zobacz na Amazon",
    tableHeading: "Szczegółowe porównanie czterech produktów",
    productsInDetailHeading: "Produkty w szczegółach",
    bestForLabel: "Najlepsze dla"
  }),
  sv: withSections("sv", {
    linkLabel: "Länk",
    imageLabel: "Bild",
    ctaAmazon: "Visa på Amazon",
    tableHeading: "Detaljerad jämförelse av de fyra produkterna",
    productsInDetailHeading: "Produkter i detalj",
    bestForLabel: "Passar för"
  }),
  da: withSections("da", {
    linkLabel: "Link",
    imageLabel: "Billede",
    ctaAmazon: "Se på Amazon",
    tableHeading: "Detaljeret sammenligning af de fire produkter",
    productsInDetailHeading: "Produkter i detaljer",
    bestForLabel: "Bedst til"
  }),
  no: withSections("no", {
    linkLabel: "Lenke",
    imageLabel: "Bilde",
    ctaAmazon: "Se på Amazon",
    tableHeading: "Detaljert sammenligning av de fire produktene",
    productsInDetailHeading: "Produkter i detalj",
    bestForLabel: "Best for"
  }),
  fi: withSections("fi", {
    linkLabel: "Linkki",
    imageLabel: "Kuva",
    ctaAmazon: "Katso Amazonissa",
    tableHeading: "Yksityiskohtainen vertailu neljästä tuotteesta",
    productsInDetailHeading: "Tuotteet yksityiskohtaisesti",
    bestForLabel: "Sopii erityisesti"
  }),
  cs: withSections("cs", {
    linkLabel: "Odkaz",
    imageLabel: "Obrázek",
    ctaAmazon: "Zobrazit na Amazonu",
    tableHeading: "Podrobné srovnání čtyř produktů",
    productsInDetailHeading: "Produkty podrobně",
    bestForLabel: "Nejlepší pro"
  }),
  hu: withSections("hu", {
    linkLabel: "Link",
    imageLabel: "Kép",
    ctaAmazon: "Megnézem az Amazonon",
    tableHeading: "A négy termék részletes összehasonlítása",
    productsInDetailHeading: "Termékek részletesen",
    bestForLabel: "Ideális"
  }),
  tr: withSections("tr", {
    linkLabel: "Bağlantı",
    imageLabel: "Görsel",
    ctaAmazon: "Amazon'da görüntüle",
    tableHeading: "Dört ürünün detaylı karşılaştırması",
    productsInDetailHeading: "Ürünler detaylı",
    bestForLabel: "En uygun"
  }),
  ja: withSections("ja", {
    linkLabel: "リンク",
    imageLabel: "画像",
    ctaAmazon: "Amazonで見る",
    tableHeading: "4製品の詳細比較",
    productsInDetailHeading: "製品の詳細",
    bestForLabel: "おすすめ"
  }),
  hi: withSections("hi", {
    linkLabel: "लिंक",
    imageLabel: "छवि",
    ctaAmazon: "Amazon पर देखें",
    tableHeading: "चार उत्पादों की विस्तृत तुलना",
    productsInDetailHeading: "उत्पाद विवरण",
    bestForLabel: "इनके लिए उपयुक्त"
  }),
  ar: withSections("ar", {
    linkLabel: "رابط",
    imageLabel: "صورة",
    ctaAmazon: "عرض على أمازون",
    tableHeading: "مقارنة تفصيلية لأربعة منتجات",
    productsInDetailHeading: "المنتجات بالتفصيل",
    bestForLabel: "مناسب لـ"
  }),
  he: withSections("he", {
    linkLabel: "קישור",
    imageLabel: "תמונה",
    ctaAmazon: "צפייה באמזון",
    tableHeading: "השוואה מפורטת של ארבעה מוצרים",
    productsInDetailHeading: "מוצרים בפירוט",
    bestForLabel: "מתאים ל"
  }),
  ko: withSections("ko", {
    linkLabel: "링크",
    imageLabel: "이미지",
    ctaAmazon: "아마존에서 보기",
    tableHeading: "4개 제품 상세 비교",
    productsInDetailHeading: "제품 상세",
    bestForLabel: "추천 대상"
  }),
  zh: withSections("zh", {
    linkLabel: "链接",
    imageLabel: "图片",
    ctaAmazon: "在亚马逊查看",
    tableHeading: "四款产品详细对比",
    productsInDetailHeading: "产品详情",
    bestForLabel: "适合"
  }),
  ru: withSections("ru", {
    linkLabel: "Ссылка",
    imageLabel: "Изображение",
    ctaAmazon: "Посмотреть на Amazon",
    tableHeading: "Подробное сравнение четырёх товаров",
    productsInDetailHeading: "Товары подробно",
    bestForLabel: "Лучше всего для"
  })
};

function getUiStrings(language: string): UiStrings {
  const lang = String(language).trim().toLowerCase();
  const ui = UI_STRINGS[lang];
  if (!ui) {
    // STRICT: kein Fallback
    throw new Error(`Konfigurationsfehler: UI_STRINGS fehlen für Sprache "${lang}".`);
  }
  return ui;
}

type LocaleStrings = {
  modelLabel: string;
  thumbnailAltSuffix: string;
  heroAltSuffix: string;
  disclaimerBlockMdx: string;
  disclaimerFootnoteMdx: string;
};

function getLocaleStrings(language: string): LocaleStrings {
  const lang = String(language).trim().toLowerCase();

  if (lang === "de") {
    return {
      modelLabel: "Modell",
      thumbnailAltSuffix: "Miniatur",
      heroAltSuffix: "Anwendung im Garten (KI)",
      disclaimerBlockMdx: `
<div class="article-disclaimer" style="
  margin: 0.75rem 0 1rem 0;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(0,0,0,0.10);
  border-radius: 12px;
  background: rgba(0,0,0,0.03);
  font-size: 0.95rem;
  line-height: 1.45;
  color: rgba(0,0,0,0.75);
">
  <strong>Hinweis:</strong>
  Dieser Artikel wurde automatisiert (teilweise KI-gestützt) auf Basis von Hersteller- und Amazon-Produktdaten erstellt.
  Angaben können unvollständig, veraltet oder fehlerhaft sein und sind nicht verbindlich.
  Maßgeblich sind die Informationen auf der jeweiligen Produktseite des Anbieters.
</div>
`.trim(),
      disclaimerFootnoteMdx: `
---
¹ *Hinweis:*  
Dieser Artikel – einschließlich der Vergleichstabelle – wurde automatisiert (teilweise KI-gestützt) auf Basis von Hersteller- und Amazon-Produktdaten erstellt. Angaben können unvollständig, veraltet oder fehlerhaft sein und sind nicht verbindlich.  
Maßgeblich sind die Informationen auf der jeweiligen Produktseite des Anbieters.
`.trim()
    };
  }

  if (lang === "fr") {
    return {
      modelLabel: "Modèle",
      thumbnailAltSuffix: "Vignette",
      heroAltSuffix: "Utilisation au jardin (IA)",
      disclaimerBlockMdx: `
<div class="article-disclaimer" style="
  margin: 0.75rem 0 1rem 0;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(0,0,0,0.10);
  border-radius: 12px;
  background: rgba(0,0,0,0.03);
  font-size: 0.95rem;
  line-height: 1.45;
  color: rgba(0,0,0,0.75);
">
  <strong>Remarque&nbsp;:</strong>
  Cet article a été généré automatiquement (en partie avec l’aide de l’IA) à partir de données fabricants et de données produits Amazon.
  Les informations peuvent être incomplètes, obsolètes ou erronées et ne sont pas contractuelles.
  Les informations faisant foi sont celles figurant sur la page produit du vendeur.
</div>
`.trim(),
      disclaimerFootnoteMdx: `
---
¹ *Remarque&nbsp;:*  
Cet article – y compris le tableau comparatif – a été généré automatiquement (en partie avec l’aide de l’IA) à partir de données fabricants et de données produits Amazon. Les informations peuvent être incomplètes, obsolètes ou erronées et ne sont pas contractuelles.  
Les informations faisant foi sont celles figurant sur la page produit du vendeur.
`.trim()
    };
  }

  // STRICT: keine stillen Misch-Sprachen
  throw new Error(`Konfigurationsfehler: LocaleStrings fehlen für Sprache "${lang}".`);
}


// 🔧 buildStyleProfile (direkt unter readStyleConfig)
// Problem:
//   styleProfile wird aktuell an zwei Stellen manuell zusammengebaut,
//   mit duplizierten Defaults. Das erschwert spätere Migration in eine Super-Config.
// Lösung:
//   Ein zentraler Helper, der aus dem rohen style-config-Objekt ein einheitliches
//   styleProfile baut. forbidden_words lassen wir bewusst pro Call-Site separat,
//   weil dort unterschiedliche Defaults verwendet werden.
function buildStyleProfile(style: any) {
  if (!style || typeof style !== "object") {
    throw new Error("style fehlt/invalid in der super-config");
  }

  // STRICT: required fields (keine Defaults)
  const required = [
    "tone",
    "perspective",
    "target_audience",
    "seo_focus",
    "keywords_strategy",
    "ai_instructions",
  ] as const;

  for (const k of required) {
    const v = style[k];
    if (typeof v !== "string" || !v.trim()) {
      throw new Error(`style.${k} fehlt in der super-config`);
    }
  }

  // OPTIONAL: style_examples (wenn vorhanden, muss Objekt sein)
  if (style.style_examples != null && typeof style.style_examples !== "object") {
    throw new Error("style.style_examples muss ein Objekt sein (oder fehlen)");
  }

  return {
    tone: style.tone.trim(),
    perspective: style.perspective.trim(),
    target_audience: style.target_audience.trim(),
    seo_focus: style.seo_focus.trim(),
    keywords_strategy: style.keywords_strategy.trim(),
    ai_instructions: style.ai_instructions.trim(),
    // Beispiele aus style.config.json (optional)
    examples: style.style_examples ?? {},
  };
}


let DOMAIN_TO_SITE: Map<string, string> | null = null;

function buildDomainToSiteMap(): Map<string, string> {
  if (DOMAIN_TO_SITE) return DOMAIN_TO_SITE;

  const map = new Map<string, string>();
  const sitesDir = path.resolve(process.cwd(), "apps", "site", "sites");

  // robust: falls Ordner nicht existiert
  if (!fs.existsSync(sitesDir)) {
    DOMAIN_TO_SITE = map;
    return map;
  }

  for (const siteId of fs.readdirSync(sitesDir)) {
    const cfgPath = path.join(sitesDir, siteId, "config.json");
    if (!fs.existsSync(cfgPath)) continue;

    try {
      const cfg = readJsonStrict<SiteConfig>(cfgPath);
      const d = String(cfg?.domain || "").trim().toLowerCase();
      if (!d) continue;

      // exakte Domain + optional www-Variante abdecken
      map.set(d, siteId);
      if (d.startsWith("www.")) map.set(d.slice(4), siteId);
      else map.set(`www.${d}`, siteId);
    } catch {
      // strict config wird später sowieso knallen – hier nur mapping skippen
    }
  }

  DOMAIN_TO_SITE = map;
  return map;
}

function extractSiteIdFromHost(host: string): string | null {
  const h = (host || "").toLowerCase().split(":")[0];
  const map = buildDomainToSiteMap();
  return map.get(h) || null;
}




	function getSiteIdStrictFromRequest(req?: Request): string {

  // ===== DEBUG =====
  console.log("=== getSiteIdStrictFromRequest ===");
  console.log("x-site-id:", req.headers.get("x-site-id"));
  console.log("x-forwarded-host:", req.headers.get("x-forwarded-host"));
  console.log("host:", req.headers.get("host"));
  // =================

  // bestehender Code folgt

	  // 1) Middleware-Header (wenn vorhanden)
	  const headerSiteId = req?.headers?.get("x-site-id")?.trim();
	  if (headerSiteId) return headerSiteId;

	// 2) Hostname parsen (Vercel/Proxy: x-forwarded-host ist oft maßgeblich)
	const host =
	  req?.headers?.get("x-forwarded-host") ||
	  req?.headers?.get("host") ||
	  "";
	const byHost = extractSiteIdFromHost(host);
	console.log("resolved siteId by host:", byHost);

	if (byHost) return byHost;

	// 3) Fallback: ENV nur lokal, sonst hart fehlschlagen (sonst immer falsche Site)
	const isLocal =
	  (host || "").includes("localhost") ||
	  (host || "").includes("127.0.0.1");

	if (isLocal) {
	  const envId = process.env.SITE_ID?.trim();
	  if (envId) return envId;
	}

	throw new Error(
	  "Konfigurationsfehler: siteId konnte nicht ermittelt werden. " +
		"Erwartet: x-site-id Header (Middleware) oder Hostname-Mapping (config.domain)."
	);


	  throw new Error(
		"Konfigurationsfehler: siteId konnte nicht ermittelt werden. " +
		  "Erwartet: x-site-id Header (Middleware) oder Hostname <siteId>.garden-hero.net oder SITE_ID ENV."
	  );
	}


	function candidateConfigPathsStrict(siteId: string): string[] {
	  // 1) Monorepo (dein Fall)
	  const p1 = path.resolve(process.cwd(), "apps", "site", "sites", siteId, "config.json");
	  // 2) Single-Repo (optional; schadet nicht, bricht aber weiterhin strikt, wenn nichts gefunden wird)
	  const p2 = path.resolve(process.cwd(), "sites", siteId, "config.json");
	  return [p1, p2];
	}

	function readJsonStrict<T = unknown>(file: string): T {
	  const raw = fs.readFileSync(file, "utf-8"); // ← synchrone API aus node:fs
	  try {
		return JSON.parse(raw) as T;
	  } catch (err: any) {
		throw new Error(
		  `Konfigurationsfehler: ${file} ist kein gültiges JSON. Details: ${(err && err.message) || String(err)}`
		);
	  }
	}


	export function getSiteConfigStrict(req?: Request): SiteConfig {
	  const siteId = getSiteIdStrictFromRequest(req);
	  const candidates = candidateConfigPathsStrict(siteId);

	  for (const file of candidates) {
		if (fs.existsSync(file)) {                 // ← synchrone Exists-Prüfung
		  const cfg = readJsonStrict<SiteConfig>(file);
			console.log("[cfg] loaded from:", file);
			console.log("[cfg] siteId:", siteId);
			console.log("[cfg] amazon.partnerTag:", cfg?.affiliate?.amazon?.partnerTag);
			console.log("[cfg] amazon.domain:", cfg?.affiliate?.amazon?.domain);

		  if (!cfg || typeof cfg !== "object") {
			throw new Error(`Konfigurationsfehler: ${file} konnte nicht geladen werden (leeres/ungültiges Objekt).`);
		  }
		  if (!cfg.categories || !Array.isArray(cfg.categories)) {
			throw new Error(`Konfigurationsfehler: 'categories' fehlt in ${file}.`);
		  }
		  return cfg;
		}
	  }

	  throw new Error(
		[
		  `Konfigurationsfehler: Keine config.json für SITE_ID="${siteId}" gefunden.`,
		  `Erwartete Pfade:`,
		  ...candidates.map(p => `- ${p}`)
		].join("\n")
	  );
	}

	function normalizeSlug(s: string): string {
	  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
	}

	export function getSiteCategoriesStrict(req?: Request): SiteCategory[] {
      const cfg = getSiteConfigStrict(req);
	  const cats = (cfg.categories || []).map((c) => {
		const slug = c.slug ? normalizeSlug(c.slug) : (c.title ? normalizeSlug(c.title) : "");
		const title = (c.title && String(c.title).trim()) || (c.slug && String(c.slug).trim()) || "";
		return { id: c.id, slug, title };
	  });

	  if (!cats.length) {
		throw new Error(
		  `Konfigurationsfehler: Keine Kategorien gefunden in SITE_ID="${cfg.siteId}". ` +
		  `Bitte 'categories' in apps/site/sites/${cfg.siteId}/config.json definieren.`
		);
	  }

	  // Wenn du weiterhin mindestens 5 erzwingen willst, lass diesen Block drin
	  if (cats.length < 5) {
		throw new Error(
		  `Konfigurationsfehler: Mindestens 5 Kategorien erforderlich, gefunden: ${cats.length}. ` +
		  `Datei: apps/site/sites/${cfg.siteId}/config.json`
		);
	  }

	  return cats;
	}




/* ======================================================================== */
/* =                               UTILITIES                               = */
/* ======================================================================== */


export function stripLinks(text: string): string {
  if (!text) return "";
  return String(text)
    // Markdown: [text](url) — erlaubt escaped ')'
    .replace(/\[([^\]]+)\]\((?:\\\)|[^\)])+\)/g, "$1")
    // HTML-Links entfernen (multiline, case-insensitiv)
    .replace(/<a\b[^>]*>(.*?)<\/a>/gis, "$1")
    // Nackte URLs
    .replace(/\bhttps?:\/\/[^\s)]+/g, "")
    .trim();
}


// FIX: Einheitliche deutsche Header für Vergleichstabellen
// Normalisiert Übersetzungen, englische Begriffe und Großschreibung.
function normalizeHeader(header: string, language: string): string {
  if (!header) return "";

  const lang = String(language).trim().toLowerCase();
  const h = header.trim();
  const key = h.toLowerCase();

  const mapDE: Record<string, string> = {
    name: "Name",
    title: "Titel",
    price: "Preis",
    brand: "Marke",
    weight: "Gewicht",
    dimensions: "Maße",
    size: "Größe",
    color: "Farbe",
    material: "Material",
    category: "Kategorie",
    features: "Eigenschaften",
    feature: "Eigenschaften",
    description: "Beschreibung",
    model: "Modell",
    capacity: "Kapazität",
    power: "Leistung",
    voltage: "Spannung",
    pros: "Vorteile",
    cons: "Nachteile",
    summary: "Zusammenfassung"
  };

  const mapFR: Record<string, string> = {
    name: "Nom",
    title: "Titre",
    price: "Prix",
    brand: "Marque",
    weight: "Poids",
    dimensions: "Dimensions",
    size: "Taille",
    color: "Couleur",
    material: "Matériau",
    category: "Catégorie",
    features: "Caractéristiques",
    feature: "Caractéristiques",
    description: "Description",
    model: "Modèle",
    capacity: "Capacité",
    power: "Puissance",
    voltage: "Tension",
    pros: "Avantages",
    cons: "Inconvénients",
    summary: "Résumé"
  };

  // Zusätzlich: falls dein Table-Key historisch "Modell" ist
  if (lang === "fr" && key === "modell") return "Modèle";
  if (lang === "de" && key === "modèle") return "Modell";

  const dict = (lang === "fr") ? mapFR : mapDE;
  const known = dict[key];
  if (known) return known;

  // Fallback: nur formatieren (ohne DE-Umlaut-Mapping bei FR)
  if (lang === "de") {
    let german = h
      .replace(/ae/g, "ä").replace(/oe/g, "ö").replace(/ue/g, "ü")
      .replace(/Ae/g, "Ä").replace(/Oe/g, "Ö").replace(/Ue/g, "Ü");
    return german.charAt(0).toUpperCase() + german.slice(1);
  }

  return h.charAt(0).toUpperCase() + h.slice(1);
}


	function safeStr(v: unknown): string {
	  return String(v ?? "").trim();
	}

	type ProductSpec = { [key: string]: unknown }; // nur für dynamischen Zugriff



	type RegistryEntry = {
	  mainKeyword?: string;
	  [key: string]: any;
	};



type ContentRegistry = { items: RegistryEntry[] };

function getRegistryPath(projectRoot: string, siteId: string) {
  return path.join(projectRoot, "sites", siteId, "content", "_registry.json");
}

function readRegistry(projectRoot: string, siteId: string): ContentRegistry {
  try {
    const p = getRegistryPath(projectRoot, siteId);
    const raw = fs.readFileSync(p, "utf8");
    const json = JSON.parse(raw);
    if (!json || !Array.isArray(json.items)) return { items: [] };
    return json as ContentRegistry;
  } catch { return { items: [] }; }
}

function writeRegistry(projectRoot: string, siteId: string, reg: ContentRegistry) {
  const p = getRegistryPath(projectRoot, siteId);
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(reg, null, 2), "utf8");
}



// ---- Synonym-Filter: natürlich, ohne Kauf-Intent/Slug-Formen ----
function shouldKeepSynonym(main: string, syn: string) {
  const nm = normDe(main);
  const ns = normDe(syn);
  if (!ns) return false;

  // identisch zum Main-Keyword -> raus
  if (nm === ns) return false;

  // â€žMainKeyword + 1 Füllwortâ€œ (z. B. â€žâ€¦ kaufen/online/günstigâ€œ) -> raus
  if (ns.startsWith(nm)) {
    const extra = ns.slice(nm.length).trim().split(/\s+/).filter(Boolean);
    if (extra.length <= 1) return false;
  }

  // Kauf-Intent / Shop-Noise -> raus
  if (/\b(kaufen|bestellen|online|guenstig|günstig|preis|angebot|deal|shop)\b/i.test(syn)) return false;

  // Slug-/Bindestrich-Wüste -> raus
  if (/(?:[a-zÃ¤Ã¶Ã¼ÃŸ])-+(?:[a-zÃ¤Ã¶Ã¼ÃŸ])|_/i.test(syn)) return false;

  // i. d. R. 2â€“4 WÃ¶rter behalten; 1-Wort nur, wenn sinnvolles Kompositum (Ã–l/Holz/MÃ¶bel/Bank/Tisch/Stuhl)
  const words = syn.trim().split(/\s+/).filter(Boolean).length;
  const isCompound = /(Ã¶l|holz|mÃ¶bel|bank|tisch|stuhl)/i.test(syn.replace(/\s+/g, ""));
  if (words < 2 && !isCompound) return false;

  // Längenbegrenzung (du nutzt später ohnehin <=45)
  if (syn.length > 60) return false;

  return true;
}


// Füllt registry.items[*].synonyms mit ~5 SEO-freundlichen Varianten auf
async function ensureRegistrySynonyms(
  projectRoot: string,
  siteId: string,
  language: string,
  targetCount = 5
) {
  const reg = readRegistry(projectRoot, siteId);
  if (!reg?.items?.length) return;

  const client = getOpenAI();

  const normKey = (s: string) => normDe(s).replace(/\s+/g, " ").trim();
  const clean = (s: string) =>
    String(s || "")
      .replace(/[â€œâ€"']/g, "")
      .replace(/[|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // sehr robuste Dedupe-Funktion (case + Umlaute)
  const dedupe = (arr: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of arr.map(clean).filter(Boolean)) {
      const k = normKey(x);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(x);
    }
    return out;
  };

  // einfache deutsch-spezifische Heuristiken (funktionieren ohne AI)
  function heuristicSynonymsDE(mainKeyword: string): string[] {
    const base = clean(mainKeyword);
    const lower = base.toLowerCase();

    // Hilfs-Konvertierungen (Material/Attribute)
    const materialSimplify = (s: string) =>
      s
        .replace(/\beichenholz\b/gi, "eiche")
        .replace(/\bholzÃ¶l\b/gi, "holzÃ¶l") // stabilisieren
        .replace(/\bÃ¶l(e)?\b/gi, "Ã¶l");

    // â€žX aus Yâ€œ â†’ Varianten
    const ausRe = /(.*)\baus\s+([a-zÃ¤Ã¶Ã¼ÃŸ\- ]+)\s*$/i;
    const fuerRe = /(.*)\bfÃ¼r\s+([a-zÃ¤Ã¶Ã¼ÃŸ\- ]+)\s*$/i;

    const cands = new Set<string>([base]);

    // Splits für â€žaus/fürâ€œ
    const ausM = lower.match(ausRe);
    const fuerM = lower.match(fuerRe);

    const add = (s: string) => cands.add(clean(s));

    // Hyphen/Order-Varianten allgemein
    const parts = base.split(/\s+/);
    if (parts.length >= 2) {
      add(`${parts.slice(-1)} ${parts.slice(0, -1).join(" ")}`); // letztes Wort nach vorn
      //add(`${parts.slice(-1)}-${parts.slice(0, -1).join(" ")}`); // mit Bindestrich
     // add(parts.join("-"));                                       // alles hyphen
    }

    // â€žaus â€¦â€œ Varianten
    if (ausM) {
      const obj = clean(base.replace(ausRe, "$1")).trim();
      const mat = materialSimplify(clean(base.replace(ausRe, "$2")).trim());
      if (obj && mat) {
        add(`${mat} ${obj}`);
        add(`${mat}-${obj}`);
        add(`${obj} ${mat}`);
        // Falls â€žholz/Ã¶lâ€œ im Spiel â†’ typische Suchform
        if (/Ã¶l|oel|holz/i.test(lower)) {
          add(`${mat} holzÃ¶l`);
          add(`Ã¶l für ${mat}`);
          add(`holzÃ¶l ${mat}`);
        }
      }
    }

    // â€žfür â€¦â€œ Varianten
    if (fuerM) {
      const obj = clean(base.replace(fuerRe, "$1")).trim();
      const tgt = materialSimplify(clean(base.replace(fuerRe, "$2")).trim());
      if (obj && tgt) {
        add(`${tgt} ${obj}`);
        add(`${tgt}-${obj}`);
        add(`${obj} ${tgt}`);
        if (/Ã¶l|oel|holz/i.test(lower)) {
          add(`holzÃ¶l ${tgt}`);
          add(`Ã¶l für ${tgt}`);
        }
      }
    }

    // kleine Normalisierungen, z. B. â€žEichenholzÃ¶lâ€œ erzeugen
    if (/eichenholz/i.test(base) && /Ã¶l|oel/i.test(base)) {
      add("eichenholzÃ¶l");
      add("holzÃ¶l eiche");
      add("Ã¶l für eiche");
    }

    // kompakte Varianten bevorzugen
    const filtered = Array.from(cands)
      .map(clean)
      .filter(Boolean)
      .filter(x => x.length <= 45);

    return dedupe(filtered);
  }

  // pro Eintrag auffüllen
  let changed = false;

  for (const e of reg.items) {
    const have = Array.isArray(e.synonyms) ? e.synonyms : [];
    let out = [...have];

    if (out.length < targetCount) {
      // Heuristik zuerst (funktioniert ohne API-Key)
      const heur = heuristicSynonymsDE(String(e.mainKeyword ?? "").trim());
      out = dedupe([...out, ...heur]);
    }

    if (client && out.length < targetCount) {
      try {
		const langInstr = outputLanguageInstruction(language);

		const sys =
		`You are an SEO keyword expander.

		LANGUAGE (hard):
		- ${langInstr}

		RULES (hard):
		- Return ONLY valid JSON: {"synonyms":["..."]}.
		- No explanations, no markdown, no quotes around the JSON.
		- Variants must be natural and search-oriented.
		`;

		const siteId = getSiteIdStrictFromRequest(req);
		const style = readStyleConfig(siteId);
		const styleProfile = buildStyleProfile(style); // SAFE: zentraler Style-Block
        const prompt = {
          mainKeyword: e.mainKeyword,
          category: e.category,
          constraints: {
            count: targetCount,
            language,
            style: "kurz, natürlich, suchorientiert",
			

		  // 🟢 Neu: Stil-Kontext aus style.config.json
		  styleProfile: {
			  ...styleProfile,
			  // Synonym-Generator-spezifischer Default:
			  forbidden_words: style.forbidden_words ?? []
			},
            // 2â€“4 WÃ¶rter, alltagsnah, Varianten mit/ohne Bindestrich und Wortreihenfolge
            rules: [
              "2-4 Wörter pro Variante",
              "keine Marken, keine Preise",
              "geläufige Schreibweisen, ggf. mit/ohne Bindestrich",
              "Wortreihenfolge variieren (Kopfbegriff/Attribut)",
              "keine Anführungszeichen/Emojis/Keywords stuffing"
            ]
          }
        };

        const r = await withTimeout(
          client.chat.completions.create({
            model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini",
            messages: [
              { role: "system", content: sys },
              { role: "user", content: JSON.stringify(prompt) }
            ],
            response_format: { type: "json_object" } as any,
            max_completion_tokens: 300,
            temperature: 0.4
          }),
          20000
        );

        const txt = r.choices?.[0]?.message?.content ?? "{}";
        const parsed = tryParseJsonStrict(txt);
        const aiSyn: string[] = Array.isArray(parsed?.synonyms) ? parsed.synonyms : [];

        out = dedupe([...out, ...aiSyn]);
      } catch {
        // still fine â€“ Heuristik bleibt
      }
    }

	const kw = safeStr(e.mainKeyword);

	// 1) Hauptbegriff raus
	out = out.filter(x => normKey(x) !== normKey(kw));

	// 2) Qualitätsfilter …
	out = out.filter(s => shouldKeepSynonym(kw, s));


	// 3) nochmal deduplizieren (nach dem Filtern)
	out = dedupe(out);

	// 4) final auf ZielgrÃ¶ße kürzen
	if (out.length > targetCount) out = out.slice(0, targetCount);

    // speichern, falls geändert
    const before = JSON.stringify(have);
    const after = JSON.stringify(out);
    if (before !== after) {
      e.synonyms = out;
      changed = true;
    }
  }

  if (changed) writeRegistry(projectRoot, siteId, reg);
}





// einfache DE-Normalisierung für Keyword-Matches
function normDe(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/Ã¤/g, "ae").replace(/Ã¶/g, "oe").replace(/Ã¼/g, "ue").replace(/ÃŸ/g, "ss")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    // Sonderfälle vor Normalisierung
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    // Unicode-Diakritika entfernen: "hérisson" -> "herisson"
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    // Apostrophe/Quotes entfernen
    .replace(/['’`]/g, "")
    // alles Nicht-Alphanumerische zu Bindestrich
    .replace(/[^a-z0-9]+/g, "-")
    // Bindestriche säubern
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(str: string): string {
  return str
    ? str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
    : "";
}

function findProjectRoot(): string {
  // Kandidaten – passe sie an deine Repo-Struktur an (falls nötig)
  const candidates = [
    path.resolve(process.cwd()),                            // apps/site (falls dort gestartet)
    path.resolve(process.cwd(), ".."),                      // monorepo: apps/
    path.resolve(process.cwd(), "..", ".."),                // monorepo: repo root
  ];

  for (const p of candidates) {
    // Beispiel-Heuristik: package.json muss existieren
    const pkg = path.join(p, "package.json");
    try {
      if (fs.existsSync(pkg)) return p;
    } catch {
      // ignorieren und weiter prüfen
    }
  }

  // Letzter Fallback: current working dir
  return process.cwd();
}






function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}


function readSiteConfig(projectRoot: string, siteId: string) {
  const p = path.join(projectRoot, "sites", siteId, "config.json");

  let raw: string;
  try {
    raw = fs.readFileSync(p, "utf8");
  } catch (e: any) {
    throw new Error(`Konfigurationsfehler: config.json nicht lesbar für siteId="${siteId}" (${p}) :: ${e?.message || e}`);
  }

  let cfg: any;
  try {
    cfg = JSON.parse(raw);
  } catch (e: any) {
    throw new Error(`Konfigurationsfehler: config.json ungültiges JSON für siteId="${siteId}" (${p}) :: ${e?.message || e}`);
  }

  // STRICT: Autoren müssen aus super-config kommen (außer Foto; egal ob avatarUrl fehlt)
  if (!Array.isArray(cfg?.authors) || cfg.authors.length === 0) {
    throw new Error(`Konfigurationsfehler: authors fehlt/leer in super-config für siteId="${siteId}"`);
  }
  for (const a of cfg.authors) {
    if (!a?.id || !a?.name || !a?.bio) {
      throw new Error(`Konfigurationsfehler: Jeder Autor braucht id, name, bio (siteId="${siteId}")`);
    }
  }
	  // STRICT: Amazon Affiliate config (Multi-Marketplace-ready)
	  const amz = cfg?.affiliate?.amazon;

	  if (amz) {
		const locale = String(amz.locale || "").trim().toUpperCase();
		const partnerTag = String(amz.partnerTag || "").trim();
		const apiMarketplace = String(amz.apiMarketplace || "").trim().toUpperCase();
		const domain = String(amz.domain || "").trim().toLowerCase();

		if (!locale) {
		  throw new Error(`Konfigurationsfehler: affiliate.amazon.locale fehlt (siteId="${siteId}")`);
		}
		if (!partnerTag) {
		  throw new Error(`Konfigurationsfehler: affiliate.amazon.partnerTag fehlt (siteId="${siteId}")`);
		}
		if (!domain) {
		  throw new Error(`Konfigurationsfehler: affiliate.amazon.domain fehlt (siteId="${siteId}")`);
		}
		if (!apiMarketplace) {
		  throw new Error(`Konfigurationsfehler: affiliate.amazon.apiMarketplace fehlt (siteId="${siteId}")`);
		}

		// normalize back into cfg (so downstream code reads consistent values)
		cfg.affiliate.amazon.locale = locale;
		cfg.affiliate.amazon.partnerTag = partnerTag;
		cfg.affiliate.amazon.apiMarketplace = apiMarketplace;
		cfg.affiliate.amazon.domain = domain;
	  }

  return cfg;
}


function maskKey(k?: string | null) {
  if (!k) return null;
  const s = String(k);
  if (s.length <= 8) return "*".repeat(s.length);
  return s.slice(0, 4) + "â€¦" + s.slice(-4);
}

function envSummary(siteCfg: any) {
  const openaiKey = process.env.OPENAI_API_KEY || null;

  // Multi-Site: Config hat Vorrang. ENV nur als Fallback,
  // sonst kann ein globales Deployment falsche Tags auf andere Sites drücken.
 // ===== DEBUG =====
console.log("=== AMAZON TAG RESOLUTION ===");
console.log("siteCfg.key:", siteCfg?.key);
console.log(
  "partnerTag from config:",
  siteCfg?.affiliate?.amazon?.partnerTag
);
console.log(
  "partnerTag from env:",
  process.env.AMAZON_PA_PARTNER_TAG
);
// =================



	const partner = siteCfg?.affiliate?.amazon?.partnerTag;

	if (!partner) {
	  throw new Error(
		`Missing amazon partnerTag for site ${siteCfg?.key}`
	  );
	}


  const locale = siteCfg?.affiliate?.amazon?.locale || null;
  const apiMarketplace = siteCfg?.affiliate?.amazon?.apiMarketplace || null;
  const domain = siteCfg?.affiliate?.amazon?.domain || null;

  return {
    openai_present: !!openaiKey,
    openai_masked: maskKey(openaiKey),

    amazon_tag_present: !!partner,
    amazon_tag_masked: maskKey(partner),

    amazon_locale: locale,
    amazon_api_marketplace: apiMarketplace,
    amazon_domain: domain,
  };
}


async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
async function withTimeout<T>(p: Promise<T>, ms = 150000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`openai timeout after ${ms}ms`)), ms)),
  ]) as Promise<T>;
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key || !/^sk-/.test(key)) return null;
  return new OpenAI({ apiKey: key });
}

/** defensives get */
function gp(obj: any, pathArr: string[]): any {
  return pathArr.reduce((o, k) => (o && k in o ? o[k] : undefined), obj);
}
function s(v: any): string { if (v == null) return ""; if (Array.isArray(v)) return v.join(" "); return String(v); }
function firstNonEmpty(...vals: any[]): string {
  for (const v of vals) { const t = s(v).trim(); if (t) return t; } return "";
}
function truncate(str: string, max = 100): string {
  const t = str.trim(); if (t.length <= max) return t; return t.slice(0, max - 1) + "â€¦";
}

function parseEnergy(text: string): "Akku" | "Netz" | "Benzin" | "" {
  const T = text.toLowerCase();
  if (/(akku|battery|cordless|li-?ion)/.test(T)) return "Akku";
  if (/(netz|electric|corded|230v|220v|110v|kabel)/.test(T)) return "Netz";
  if (/(benzin|petrol|gasoline)/.test(T)) return "Benzin";
  return "";
}
function parseCutWidth(text: string): string {
  const t = String(text || "").toLowerCase();

  // Guard: nur wenn explizit "Schnitt-/Mäh-/Arbeitsbreite" etc. erwähnt wird
  const hasCutSignal =
    /\b(schnittbreite|mähbreite|maehbreite|arbeitsbreite|schneidbreite)\b/.test(t) ||
    /\b(cut(?:ting)?\s*width|working\s*width)\b/.test(t);

  if (!hasCutSignal) return "";

  // Nur Werte akzeptieren, die direkt bei einem Cut-Label stehen (kein generisches "Breite")
  // Beispiele: "Schnittbreite 30 cm", "Arbeitsbreite: 45cm", "cutting width: 12 in"
  const m =
    t.match(/\b(schnittbreite|mähbreite|maehbreite|arbeitsbreite|schneidbreite|cut(?:ting)?\s*width|working\s*width)\b[^0-9]{0,20}(\d{1,3}(?:[.,]\d{1,2})?)\s*(cm|mm|m|in|inch|")\b/) ||
    t.match(/(\d{1,3}(?:[.,]\d{1,2})?)\s*(cm|mm|m|in|inch|")\b[^a-z]{0,20}\b(schnittbreite|mähbreite|maehbreite|arbeitsbreite|schneidbreite|cut(?:ting)?\s*width|working\s*width)\b/);

  if (!m) return "";

  const valRaw = m[2] ?? m[1];
  const unitRaw = m[3] ?? m[2];

  let val = Number(String(valRaw).replace(",", "."));
  if (!Number.isFinite(val)) return "";

  const unit = String(unitRaw).toLowerCase();

  // Normalisieren -> cm
  if (unit === "mm") val = val / 10;
  else if (unit === "m") val = val * 100;
  else if (unit === "in" || unit === "inch" || unit === `"`) val = val * 2.54;
  // cm bleibt

  // Sanity: Schnittbreiten typischer Geräte (pragmatisch; verhindert 200cm Igelhaus-Breite)
  if (val < 5 || val > 80) return "";

  return `${val.toFixed(0)} cm`;
}

function parseWeight(text: string): string {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s?kg/i); if (m) return `${m[1].replace(".", ",")} kg`;
  const g = text.match(/(\d{3,4})\s?g/i); if (g) { const kg = (parseFloat(g[1]) / 1000).toFixed(1).replace(".", ","); return `${kg} kg`; }
  return "";
}
function pickUSP(features: string[], brand: string): string {
  const short = features.find(f => f && f.length <= 80);
  return short || brand || "";
}


	/* ===================== HEADER IMAGE PROMPT BUILDER ===================== */

	function toTitleCaseDe(s: string) {
	  return s.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1));
	}

	// sehr einfache Heuristik + kleine Ausnahmeliste. Bei Bedarf erweitern.
	const PLURAL_OVERRIDES: Record<string, string> = {
	  "kettensäge": "Kettensägen",
	  "kettensagen": "Kettensägen",
	  "gartenhacke": "Gartenhacken",
	  "terrassensofa": "Terrassensofas",
	};

	function pluralizeDe(mainKeyword: string): string {
	  const key = mainKeyword.trim().toLowerCase();
	  if (PLURAL_OVERRIDES[key]) return PLURAL_OVERRIDES[key];

	  // Heuristiken (einfach gehalten, besser als nichts)
	  if (key.endsWith("e")) return toTitleCaseDe(mainKeyword + "n");   // „Hacke“ → „Hacken“
	  if (key.endsWith("er")) return toTitleCaseDe(mainKeyword);        // „Bohrer“ → „Bohrer“
	  if (key.endsWith("a")) return toTitleCaseDe(mainKeyword + "s");   // „Sofa“ → „Sofas“
	  return toTitleCaseDe(mainKeyword + "e");                          // fallback: „Säge“ → „Sägee“ (nicht schön, aber selten)
	}

	// sehr schlanke Klassifizierung → steuert Bildsprache
	type KeywordClass = "tool" | "furniture" | "garden" | "generic";
	function classifyKeyword(k: string): KeywordClass {
	  const s = k.toLowerCase();
	  if (/(säge|sägen|kettensäge|kettensagen|bohrer|schleifer|fräse|hobel|hammer|messer|werkzeug)/.test(s)) return "tool";
	  if (/(sofa|couch|stuhl|tisch|möbel|terrasse|lounge|sessel)/.test(s)) return "furniture";
	  if (/(garten|hacke|rechen|spaten|rasen|gartengerät|bewässerung|schlauch)/.test(s)) return "garden";
	  return "generic";
	}


function headlineVariants(mainKeyword: string, year: number, language: string): string[] {
  const lang = String(language).trim().toLowerCase();
  const mkRaw = String(mainKeyword || "").trim();
  if (!mkRaw) return [];

  const MAP: Record<string, string[]> = {
    de: (() => {
      const mk = toTitleCaseDe(mkRaw);
      const mkPlural = pluralizeDe(mkRaw);
      return [
        `Welche ist die beste ${mk}?`,
        `Top 5 ${mkPlural} im Vergleich`,
        `So wählen Profis ihre ${mkPlural}`,
        `Nie wieder die falsche ${mk} kaufen`,
        `Unser ${mkPlural}-Vergleich`,
      ];
    })(),

    en: [
      `Which ${mkRaw} is best?`,
      `Top 5 ${mkRaw} compared`,
      `How pros choose ${mkRaw}`,
      `Avoid buying the wrong ${mkRaw}`,
      `${mkRaw} comparison`,
    ],

    fr: [
      `Quel(le) ${mkRaw} choisir ?`,
      `Top 5 ${mkRaw} – comparatif`,
      `Comment les pros choisissent ${mkRaw}`,
      `Évitez d’acheter le mauvais ${mkRaw}`,
      `Comparatif : ${mkRaw}`,
    ],

    es: [
      `¿Cuál es el mejor ${mkRaw}?`,
      `Top 5 ${mkRaw} comparados`,
      `Cómo eligen los profesionales ${mkRaw}`,
      `Evita comprar el ${mkRaw} equivocado`,
      `Comparativa: ${mkRaw}`,
    ],

    it: [
      `Qual è il miglior ${mkRaw}?`,
      `Top 5 ${mkRaw} a confronto`,
      `Come scelgono i professionisti ${mkRaw}`,
      `Evita di comprare il ${mkRaw} sbagliato`,
      `Confronto: ${mkRaw}`,
    ],

    pt: [
      `Qual é o melhor ${mkRaw}?`,
      `Top 5 ${mkRaw} comparados`,
      `Como os profissionais escolhem ${mkRaw}`,
      `Evite comprar o ${mkRaw} errado`,
      `Comparação: ${mkRaw}`,
    ],

    nl: [
      `Welke ${mkRaw} is het beste?`,
      `Top 5 ${mkRaw} vergeleken`,
      `Hoe professionals ${mkRaw} kiezen`,
      `Voorkom dat je de verkeerde ${mkRaw} koopt`,
      `Vergelijking: ${mkRaw}`,
    ],

    pl: [
      `Który ${mkRaw} jest najlepszy?`,
      `Top 5 ${mkRaw} – porównanie`,
      `Jak profesjonaliści wybierają ${mkRaw}`,
      `Nie kupuj złego ${mkRaw}`,
      `Porównanie: ${mkRaw}`,
    ],

    sv: [
      `Vilken ${mkRaw} är bäst?`,
      `Topp 5 ${mkRaw} jämförda`,
      `Så väljer proffs ${mkRaw}`,
      `Undvik att köpa fel ${mkRaw}`,
      `Jämförelse: ${mkRaw}`,
    ],

    da: [
      `Hvilken ${mkRaw} er bedst?`,
      `Top 5 ${mkRaw} sammenlignet`,
      `Sådan vælger proffer ${mkRaw}`,
      `Undgå at købe den forkerte ${mkRaw}`,
      `Sammenligning: ${mkRaw}`,
    ],

    no: [
      `Hvilken ${mkRaw} er best?`,
      `Topp 5 ${mkRaw} sammenlignet`,
      `Slik velger proffer ${mkRaw}`,
      `Unngå å kjøpe feil ${mkRaw}`,
      `Sammenligning: ${mkRaw}`,
    ],

    fi: [
      `Mikä ${mkRaw} on paras?`,
      `Top 5 ${mkRaw} vertailussa`,
      `Näin ammattilaiset valitsevat ${mkRaw}`,
      `Vältä väärän ${mkRaw} ostamista`,
      `Vertailu: ${mkRaw}`,
    ],

    cs: [
      `Který ${mkRaw} je nejlepší?`,
      `Top 5 ${mkRaw} – srovnání`,
      `Jak profíci vybírají ${mkRaw}`,
      `Vyhněte se nákupu špatného ${mkRaw}`,
      `Srovnání: ${mkRaw}`,
    ],

    hu: [
      `Melyik a legjobb ${mkRaw}?`,
      `Top 5 ${mkRaw} összehasonlítva`,
      `Így választanak a profik ${mkRaw}`,
      `Ne vedd meg a rossz ${mkRaw}-t`,
      `Összehasonlítás: ${mkRaw}`,
    ],

    tr: [
      `En iyi ${mkRaw} hangisi?`,
      `En iyi 5 ${mkRaw} karşılaştırması`,
      `Profesyoneller ${mkRaw} nasıl seçer?`,
      `Yanlış ${mkRaw} almaktan kaçının`,
      `Karşılaştırma: ${mkRaw}`,
    ],

    ja: [
      `おすすめの${mkRaw}は？`,
      `${mkRaw}おすすめ5選（比較）`,
      `プロが選ぶ${mkRaw}のポイント`,
      `失敗しない${mkRaw}の選び方`,
      `${mkRaw}比較ガイド`,
    ],

    hi: [
      `सबसे अच्छा ${mkRaw} कौन सा है?`,
      `टॉप 5 ${mkRaw} तुलना`,
      `प्रोफेशनल ${mkRaw} कैसे चुनते हैं`,
      `गलत ${mkRaw} खरीदने से बचें`,
      `${mkRaw} तुलना गाइड`,
    ],

    ar: [
      `ما هو أفضل ${mkRaw}؟`,
      `أفضل 5 ${mkRaw} مقارنة`,
      `كيف يختار المحترفون ${mkRaw}`,
      `تجنب شراء ${mkRaw} غير مناسب`,
      `دليل مقارنة: ${mkRaw}`,
    ],

    he: [
      `מהו ה-${mkRaw} הטוב ביותר?`,
      `טופ 5 ${mkRaw} – השוואה`,
      `כך מקצוענים בוחרים ${mkRaw}`,
      `איך לא לקנות ${mkRaw} לא מתאים`,
      `מדריך השוואה: ${mkRaw}`,
    ],

    ko: [
      `최고의 ${mkRaw}는?`,
      `${mkRaw} TOP 5 비교`,
      `전문가가 고르는 ${mkRaw} 기준`,
      `잘못된 ${mkRaw} 구매 피하기`,
      `${mkRaw} 비교 가이드`,
    ],

    zh: [
      `哪款${mkRaw}最好？`,
      `${mkRaw} TOP 5 对比`,
      `专业人士如何选择${mkRaw}`,
      `避免买错${mkRaw}`,
      `${mkRaw} 对比指南`,
    ],

    ru: [
      `Какой ${mkRaw} лучше?`,
      `Топ-5: ${mkRaw} — сравнение`,
      `Как профи выбирают ${mkRaw}`,
      `Как не купить плохой ${mkRaw}`,
      `Сравнение: ${mkRaw}`,
    ],
  };

  const variants = MAP[lang];
  if (!variants || variants.length === 0) {
    throw new Error(`Konfigurationsfehler: headlineVariants hat keine Varianten für language="${lang}".`);
  }
  return variants;
}


	function pickRandom<T>(arr: T[]): T {
	  return arr[Math.floor(Math.random() * arr.length)];
	}

	function buildBackgroundLine(mainKeyword: string): string {
	  const klass = classifyKeyword(mainKeyword);
	  const mkEnHint = mainKeyword; // wir bleiben deutsch, aber beschreiben die Szene in Englisch (meist bessere Bildmodelle)

	  switch (klass) {
		case "tool":
		  return `Background: dramatic close-up of a ${mkEnHint} in action on appropriate material (angled, cropped, partially visible). Flying particles (sawdust, sparks, or debris) add motion.`;
		case "furniture":
		  return `Background: styled terrace scene featuring a ${mkEnHint}, shallow depth of field, soft natural light. Keep the product partially visible and tastefully cropped.`;
		case "garden":
		  return `Background: close-up of a ${mkEnHint} interacting with soil/grass (angled, cropped, partially visible). Subtle dirt particles for motion.`;
		default:
		  return `Background: tasteful close-up of a ${mkEnHint} in a realistic use context (angled, cropped, partially visible) with subtle motion cues.`;
	  }
	}

function buildHeaderTitle(headline: string, mainKeyword: string, language: string): string {
  const lang = String(language).trim().toLowerCase();
  const kw = toTitleCaseDe(String(mainKeyword || "").trim());

  const SUFFIX: Record<string, string> = {
    de: `${kw} Vergleich`,
    en: `${kw} comparison`,
    fr: `Comparatif ${kw}`,
    es: `Comparación de ${kw}`,
    it: `Confronto ${kw}`,
    pt: `Comparação de ${kw}`,
    nl: `${kw} vergelijking`,
    pl: `Porównanie ${kw}`,
    sv: `${kw}-jämförelse`,
    da: `${kw} sammenligning`,
    no: `${kw} sammenligning`,
    fi: `${kw} vertailu`,
    cs: `Srovnání ${kw}`,
    hu: `${kw} összehasonlítás`,
    tr: `${kw} karşılaştırması`,
    ja: `${kw} 比較`,
    hi: `${kw} तुलना`,
    ar: `مقارنة ${kw}`,
    he: `השוואת ${kw}`,
    ko: `${kw} 비교`,
    zh: `${kw} 对比`,
    ru: `Сравнение ${kw}`,
  };

  const suffix = SUFFIX[lang];
  if (!suffix) {
    throw new Error(`Konfigurationsfehler: buildHeaderTitle hat keinen Suffix für language="${lang}".`);
  }

  return `${String(headline || "").trim()} – ${suffix}`.trim();
}




	export function buildHeaderImageSpec(mainKeyword: string, language: string) {
	  const year = new Date().getFullYear();
	  const variants = headlineVariants(mainKeyword, year, language);
	  const headline = pickRandom(variants);

	  const background = buildBackgroundLine(mainKeyword, language);

	  const prompt = `Professional, eye-catching hero image for a ${mainKeyword} comparison article.

						Scene:
						A premium, realistic hero scene featuring ${mainKeyword} as the clear main subject,
						presented in a confident, aspirational way.

						Lighting:
						Bright, natural daylight with a warm, uplifting mood.
						Cinematic depth and contrast, but no dark shadows and no vignette.

						Composition:
						Strong visual focus on the main subject, slightly off-center.
						Clean foreground, calm background with subtle depth.
						Enough open space for headline overlay, but without making the image feel empty.
						Nothing important touching the edges.

						Style:
						High-end, modern, realistic photography style.
						Sharp details, rich but natural colors, premium look.

						Technical:
						Ultra high resolution, wide aspect ratio (21:9).
						No text, no titles, no logos, no watermarks, no typography.
						`;

	  const title = buildHeaderTitle(mainKeyword, headline, language);

	  return { headline, prompt, title };
	}



	/* ===================== COMPARISON TABLE BUILDER (dynamic 4 specs) ===================== */

	// 1) Modell zuverlässig ableiten – ohne Dummy/Fallbacktext
	function extractModelFromTitle(title?: string): string | null {
	  if (!title) return null;
	  const t = title.trim();
	  const m =
		t.match(/\b[A-Z]{2,}\d{2,}[A-Z0-9-]*\b/) || // BOSCH123, ABC1234X
		t.match(/\b[A-Z0-9]{2,}-[A-Z0-9]{2,}\b/) || // MK-II, XR-200
		t.match(/\b\d{3,}[A-Z0-9-]*\b/);            // 1200W, 500S
	  return m ? m[0] : null;
	}

	function resolveModel(p: any): string {
	  return (
		p?.model ||
		p?.specs?.model ||
		extractModelFromTitle(p?.name) ||
		p?.asin || // letzter echter Wert aus Amazon
		""         // leer lassen, KEIN Platzhaltertext
	  );
	}

	// 2) Werte normalisieren (nur echte Werte; leere werden leer gelassen)
	function normValCT(v: any): string {
	  if (v == null) return "";
	  const s = String(v).trim();
	  if (!s || s === "-" || /^unknown$/i.test(s)) return "";
	  return s;
	}



	// 3) Aus EINEM Produkt: so viele "Eigenschaft → Wert" Paare wie möglich sammeln
	function collectSpecPairsFromProduct(p: any): Record<string, string> {
	  const out: Record<string, string> = {};
	  const candidates: Array<[string, any]> = [];

	  // häufige Felder (falls vorhanden)
	  candidates.push(["Gewicht", p?.weight]);
	  candidates.push(["Abmessungen", p?.dimensions || p?.size]);
	  candidates.push(["Leistung", p?.power || p?.wattage]);
	  candidates.push(["Spannung", p?.voltage]);
	  candidates.push(["Drehzahl", p?.speed || p?.rpm]);
	  candidates.push(["Kettengeschwindigkeit", p?.chainSpeed]);
	  candidates.push(["Schnittbreite", p?.cuttingWidth]);
	  candidates.push(["Schnitttiefe", p?.cuttingDepth]);
	  candidates.push(["Max. Druck", p?.maxPressure]);
	  candidates.push(["Durchfluss", p?.flowRate]);
	  candidates.push(["Kapazität", p?.capacity || p?.volume]);
	  candidates.push(["Material", p?.material]);
	  candidates.push(["Farbe", p?.color]);

	  // technische Details (Maps)
	  if (p?.technicalDetails && typeof p.technicalDetails === "object") {
		for (const [k, v] of Object.entries(p.technicalDetails)) {
		  candidates.push([k, v]);
		}
	  }
	  if (p?.specs && typeof p.specs === "object") {
		for (const [k, v] of Object.entries(p.specs)) {
		  candidates.push([k, v]);
		}
	  }
	  // Features (nur wenn vorhanden)
	  if (Array.isArray(p?.features)) {
		p.features.slice(0, 6).forEach((f: any, i: number) => candidates.push([`Feature ${i + 1}`, f]));
	  }

	  for (const [labelRaw, val] of candidates) {
		const label = String(labelRaw).trim();
		const v = normVal(val);
		if (!label || !v) continue;
		if (out[label] == null) out[label] = v; // erstes Vorkommen gewinnt
	  }

	  // nie Modell/Bild als Spec ausgeben
	  delete out["Modell"];
	  delete out["Bild"];
	  return out;
	}

/* 	// 4) Über ALLE Produkte: die besten 4 Eigenschafts-Keys wählen
	function chooseTopSpecKeys(products: any[], k = 4): string[] {
	  const freq = new Map<string, { count: number; score: number }>();

	  const valueScore = (val: string) => {
		let s = 0;
		if (/\d/.test(val)) s += 1; // hat Zahl
		if (/\b(cm|mm|m|kg|g|w|kw|v|bar|l|l\/h|db|nm)\b/i.test(val)) s += 1; // hat Einheit
		if (val.length >= 3) s += 0.5;
		return s;
	  };

	  const allPairs = products.map(collectSpecPairsFromProduct);

	  for (const pairs of allPairs) {
		for (const [key, vRaw] of Object.entries(pairs)) {
		  const v = normVal(vRaw);
		  if (!v) continue;
		  const f = freq.get(key) || { count: 0, score: 0 };
		  f.count += 1;
		  f.score += valueScore(v);
		  freq.set(key, f);
		}
	  }

	  return [...freq.entries()]
		.sort((a, b) => (b[1].count - a[1].count) || (b[1].score - a[1].score))
		.slice(0, k)
		.map(([key]) => key);
	}
 */

	/* ===================== COMPARISON TABLE – GENERIC HELPERS ===================== */

	/** Marke + Produktbezeichnung zusammensetzen (ASCII-sichere Ausgabe) */
	function buildDisplayName(p: any): string {
	  const brand = String(p?.brand || p?.manufacturer || "").trim();
	  let title = String(p?.name || p?.title || "").trim();

	  // Duplikate entfernen („Brand Brand Produkt…“)
	  if (brand && title.toLowerCase().startsWith(brand.toLowerCase())) {
		title = title.slice(brand.length).trim().replace(/^[-–:,.\s]+/, "");
	  }

	  // Typografische Zeichen → ASCII, um Mojibake zu vermeiden
	  const asciiSanitize = (s: string) =>
		s
		  // Ellipsis/Gedanken-/Halbgeviertstrich & Bullet
		  .replace(/\u2026/g, "...")   // … → ...
		  .replace(/[\u2012\u2013\u2014\u2212]/g, "-") // ‒–—− → -
		  .replace(/\u2022/g, "-")     // • → -
		  // „Smart quotes“
		  .replace(/[\u2018\u2019\u2032]/g, "'") // ‘ ’ ′ → '
		  .replace(/[\u201C\u201D\u2033]/g, '"') // “ ” ″ → "
		  // seltsame Steuerzeichen
		  .replace(/[\u0000-\u001F]/g, "")
		  // Mehrfach-Spaces
		  .replace(/\s+/g, " ")
		  .trim();

	  const safeBrand = asciiSanitize(brand);
	  const safeTitle = asciiSanitize(title);

	  if (safeBrand && safeTitle) return `${safeBrand} ${safeTitle}`;
	  return safeTitle || safeBrand || (p?.asin || "");
	}


	/** Nur echte, sinnvolle Strings durchlassen */
	function normVal(v: any): string {
	  if (v == null) return "";
	  const s = String(v).trim();
	  if (!s || s === "-" || /^unknown$/i.test(s)) return "";
	  return s;
	}

	/**
	 * Aus den Produktdaten + Beschreibung generisch Eigenschaft→Wert-Paare sammeln.
	 * Keine starren Vorlagen: wir ziehen ALLES heran, was real vorhanden ist.
	 * Zusätzlich: aus der Beschreibung generisch Einheiten/„wertvolle“ Phrasen extrahieren.
	 */
	function collectGenericPairs(p: any): Record<string, string> {
	  const out: Record<string, string> = {};
	  const candidates: Array<[string, any]> = [];

	  // 1) Flache häufige Felder übernehmen, wenn vorhanden (ohne Kategorie-Annäherung)
	  const flatMap: Array<[string, any]> = [
		["Marke", p?.brand || p?.manufacturer],
		["Farbe", p?.color],
		["Material", p?.material],
		["Menge", p?.packageQuantity || p?.quantity],
		["Gewicht", p?.itemWeight],
		["Abmessungen", p?.dimensions || p?.size || p?.itemDimensions],
		["Besonderheiten", p?.specialFeatures || p?.features?.join(", ")],
	  ];
	  flatMap.forEach((pair) => candidates.push(pair));

	  // 2) Maps/Objekte flachziehen (technicalDetails/specs), Keys hübschen
	  const takeObject = (obj: any) => {
		if (obj && typeof obj === "object") {
		  for (const [k, v] of Object.entries(obj)) {
			const label = beautifyKey(k);
			candidates.push([label, v]);
		  }
		}
	  };
	  takeObject(p?.technicalDetails);
	  takeObject(p?.specs);

	  // 3) Beschreibungstext grob parsen: Mengen/Einheiten/angereicherte Phrasen
	  const text = [
		String(p?.description || ""),
		Array.isArray(p?.bullets) ? p.bullets.join(" • ") : "",
		Array.isArray(p?.features) ? p.features.join(" • ") : "",
	  ]
		.join(" ")
		.replace(/\s+/g, " ")
		.trim();

	  if (text) {
		// a) Mengenangaben (g, kg, ml, L, Stück, Samen, Packung etc.)
		const qtyRegex = /\b(\d+(?:[.,]\d+)?)\s?(g|kg|ml|l|st(ück)?|samen|pcs|pack|beutel)\b/gi;
		let m;
		while ((m = qtyRegex.exec(text))) {
		  const val = `${m[1]} ${m[2]}`.replace(/,/, ".").toUpperCase();
		  candidates.push(["Menge", val]);
		}

		// b) Maße (cm/mm/m) – z. B. 30 cm, 10–15 cm
		const sizeRegex = /\b(\d+(?:[.,]\d+)?)(?:\s?–\s?|\s?-\s?)?(\d+(?:[.,]\d+)?)?\s?(mm|cm|m)\b/gi;
		while ((m = sizeRegex.exec(text))) {
		  const a = m[1].replace(",", ".");
		  const b = m[2] ? m[2].replace(",", ".") : "";
		  const unit = m[3];
		  const val = b ? `${a}–${b} ${unit}` : `${a} ${unit}`;
		  candidates.push(["Maße", val]);
		}

		// c) Zeitraum/Blüte/Ernte – generisch (wir erzeugen KEINE starre Liste, nur Label aus Wortfamilien)
		const timeHints: Array<[RegExp, string]> = [
		  [/\bblüte\b|\bblüht\b|\bblütezeit\b/i, "Blütezeit"],
		  [/\bernte\b|\breif\b/i, "Erntezeit"],
		  [/\baussaat\b|\bsäen\b|\bsaat\b/i, "Aussaat"],
		  [/\bkeimung\b/i, "Keimung"],
		];
		for (const [re, label] of timeHints) {
		  const hit = text.match(new RegExp(`(.{0,40}${re.source}.{0,40})`, re.flags));
		  if (hit && hit[0]) {
			// kurze, saubere Phrase extrahieren
			const phrase = cleanupPhrase(hit[0]);
			candidates.push([label, phrase]);
		  }
		}

		// d) „Bio/Öko“-Hinweise generisch
		if (/\bbio\b|\bökologisch\b|\borganic\b/i.test(text)) {
		  candidates.push(["Bio", "Ja"]);
		}

		// e) Farbe (Wortfamilien)
		const colorHit = text.match(/\b(gelb|gelben|gelber|yellow|schwarz|weiß|weiss|rot|orange|mehrfarbig)\b/i);
		if (colorHit) candidates.push(["Farbe", beautifyWord(colorHit[0])]);
	  }

	  // 4) Kandidaten normalisieren & in out übernehmen
	  for (const [labelRaw, valRaw] of candidates) {
		const label = String(labelRaw).trim();
		const val = normValCT(valRaw);
		if (!label || !val) continue;
		if (out[label] == null) out[label] = val; // erstes Vorkommen gewinnt
	  }

	  // Modell/Bild niemals als Spec führen
	  delete out["Modell"];
	  delete out["Bild"];

	  return out;
	}

	/** Key-Beautifier: macht Amazon-/Snake-/Camel-Keys lesbar */
	function beautifyKey(k: string): string {
	  const map: Record<string, string> = {
		itemdimensions_weight: "Gewicht",
		itemdimensions_length: "Länge",
		itemdimensions_width: "Breite",
		itemdimensions_height: "Höhe",
		packagedimensions_weight: "Paketgewicht",
		packagequantity: "Menge",
		materialtype: "Material",
		specialfeatures: "Besonderheiten",
	  };
	  const norm = k.toString().toLowerCase().replace(/[^a-z0-9]+/g, "");
	  if (map[norm]) return map[norm];

	  return (
		k
		  .toString()
		  .replace(/[_-]+/g, " ")
		  .replace(/([a-z])([A-Z])/g, "$1 $2")
		  .replace(/\s+/g, " ")
		  .trim()
		  .replace(/^\w/, (c) => c.toUpperCase())
	  );
	}

	/** Wort hübschen (z. B. „gelben“ → „Gelb“) */
	function beautifyWord(w: string): string {
	  return w
		.toLowerCase()
		.replace(/weiss/g, "weiß")
		.replace(/gelben|gelber/g, "gelb")
		.replace(/^\w/, (c) => c.toUpperCase());
	}

	/** kurze, saubere Phrase aus Kontext schneiden */
	function cleanupPhrase(s: string): string {
	  return s.replace(/\s+/g, " ").replace(/[•|–-]\s*/g, " ").trim();
	}

	/** Aus allen Produkten die „besten“ N Keys wählen – generisch, ohne Kategorie-Listen */
	function chooseTopSpecKeysGeneric(products: any[], n = 3): string[] {
	  const freq = new Map<string, { count: number; info: number }>();

	  const infoScore = (val: string) => {
		let s = 0;
		if (/\d/.test(val)) s += 1; // enthält Zahl
		if (/\b(mm|cm|m|g|kg|ml|l|st|stück|pcs|w|v|db)\b/i.test(val)) s += 1; // hat Einheit
		if (val.length >= 3) s += 0.5; // nicht zu kurz
		return s;
	  };

	  const pairsArr = products.map(collectGenericPairs);
	  for (const pairs of pairsArr) {
		for (const [k, v] of Object.entries(pairs)) {
		  const val = normValCT(v);
		  if (!val) continue;
		  const prev = freq.get(k) || { count: 0, info: 0 };
		  prev.count += 1;
		  prev.info += infoScore(val);
		  freq.set(k, prev);
		}
	  }

	  return [...freq.entries()]
		.sort((a, b) => (b[1].count - a[1].count) || (b[1].info - a[1].info))
		.slice(0, n)
		.map(([k]) => k);
	}



	// 5) Öffentliche Funktion: baut die Vergleichstabelle { headers, rows }
	export function buildComparisonTable(products: any[]) {
	  // Spalten 1–2 fix
	  const headers = ["Modell", "Bild"];

	  // Generisch: die besten 3 Eigenschafts-Keys aus realen Daten wählen
	  const specKeys = chooseTopSpecKeysGeneric(products, 3);
	  headers.push(...specKeys);

	  // Optional: Link-Spalte am Ende (falls du sie brauchst)
	  const includeLink = true;
	  if (includeLink) headers.push("Link");

	  // Zeilen bauen (nur echte Werte, keine Dummy-Texte)
	  const rows = products.map((p) => {
		const pairs = collectGenericPairs(p);

		const modelDisplay = buildDisplayName(p);
		const img =
		  p?.image ||
		  p?.img ||
		  p?.imgAi ||
		  (Array.isArray(p?.images) && p.images[0]?.url) ||
		  "";

		const row: Record<string, string> = {
		  Modell: modelDisplay || "",
		  Bild: img || "",
		};

		// Spalten 3–5 dynamisch füllen
		for (let i = 0; i < specKeys.length; i++) {
		  const key = specKeys[i];
		  row[key] = pairs[key] || ""; // leer lassen, wenn nichts da ist
		}

		// Optionaler Link (Partner-URL, falls vorhanden)
		if (includeLink) {
		  row["Link"] = (p?.url || p?.detailPageURL || p?.affiliateUrl || "") as string;
		}

		return row;
	  });

	  return { headers, rows };
	}




	/* ======================================================================== */
	/* =                     LINKING: REGISTRY + NETWORK                       = */
	/* ======================================================================== */

	type NetworkLink = {
	  id?: string;
	  type?: "network" | "external";
	  siteId?: string;
	  domain?: string;
	  title: string;
	  url: string;
	  keywords?: Array<{ kw: string; match?: "exact" | "phrase" | "regex"; anchor?: string[] }>;
	  rel?: string;
	  language?: string;
	  categories?: string[];
	  group?: string;        // pro Artikel nur EIN Link je group
	  used?: number;
	  usedBy?: string[];
	  updatedAt?: string;
	};

	type ExternalRules = {
	  maxNetworkLinksPerArticle?: number;           // Default 3
	  dedupeNetworkPerKeyword?: boolean;            // Default true (bei Auswahl je group nur 1)
	  match?: { caseInsensitive?: boolean; stripDiacritics?: boolean };
	};

	type CentralNetworkJson = {
	  meta?: { version?: string };
	  rules?: ExternalRules;
	  links: NetworkLink[];
	};

	/** JSON sicher lesen (silent) */
	function safeReadJson<T = any>(p: string): T | null {
	  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
	  catch { return null; }
	}

	/** Interne Keywords laden, um Konflikte zu vermeiden (aus deiner content/_registry.json) */
	function loadInternalKeywords(projectRoot: string, siteId: string): Set<string> {
	  const set = new Set<string>();
	  try {
		const reg = readRegistry(projectRoot, siteId); // nutzt deinen bestehenden Reader
		for (const it of reg.items || []) {
		  if (typeof (it as any).mainKeyword === "string") {
			const kw = String((it as any).mainKeyword).trim();
			if (kw) set.add(kw);
		  }
		  // falls du Synonyme im Registry-Eintrag pflegst, auch berücksichtigen
		  if (Array.isArray((it as any).synonyms)) {
			for (const s of (it as any).synonyms) {
			  if (typeof s === "string" && s.trim()) set.add(s.trim());
			}
		  }
		  // optional: falls du dort weitere keyword-Felder nutzt
		  if (Array.isArray((it as any).keywords)) {
			for (const s of (it as any).keywords) {
			  if (typeof s === "string" && s.trim()) set.add(s.trim());
			}
		  }
		}
	  } catch { /* ignore */ }
	  return set;
	}

	/** Pfad zur zentralen Netzwerkdatei (per ENV überschreibbar) */
	function pathCentralNetwork(projectRoot: string): string {
	  const env = process.env.CENTRAL_NETWORK_PATH;
	  return env && env.trim().length > 0
		? env
		: path.join(projectRoot,"sites",  "_network_central.json");
	}

	/** Zentrale Netzwerkdatei laden (nur type=network, eigene Site ausfiltern) */
	function loadCentralNetwork(projectRoot: string, currentSiteId: string): { rules: ExternalRules; links: NetworkLink[] } {
	  const p = pathCentralNetwork(projectRoot);
	  const data = (safeReadJson<CentralNetworkJson>(p) || { links: [] }) as CentralNetworkJson;

	  const rules: ExternalRules = {
		maxNetworkLinksPerArticle: 3,
		dedupeNetworkPerKeyword: true,
		match: { caseInsensitive: true, stripDiacritics: true },
		...(data.rules || {})
	  };

	  const links = (data.links || []).filter(l =>
		(l.type || "network") === "network" && l.siteId !== currentSiteId
	  );

	  return { rules, links };
	}

	/** In zentrale Datei upserten (aktuellen Artikel eintragen/aktualisieren) */
	function upsertCentralNetwork(projectRoot: string, entry: NetworkLink) {
	  const p = pathCentralNetwork(projectRoot);
	  const nowIso = new Date().toISOString();
	  let data = safeReadJson<CentralNetworkJson>(p);
	  if (!data) data = { meta: { version: "1.0" }, links: [] };

	  const id = entry.id || `${entry.siteId}:${entry.url}`;
	  const normalized: NetworkLink = {
		...entry,
		id,
		type: "network",
		used: entry.used ?? 0,
		usedBy: entry.usedBy ?? [],
		updatedAt: nowIso,
		keywords: (entry.keywords || []).map(k => ({ kw: k.kw, match: k.match || "phrase", anchor: k.anchor }))
	  };

	  const idxById = data.links.findIndex(l => l.id === id);
	  const idxByUrl = data.links.findIndex(l => l.url === entry.url);
	  const idx = idxById >= 0 ? idxById : idxByUrl;

	  if (idx >= 0) {
		data.links[idx] = { ...data.links[idx], ...normalized, updatedAt: nowIso };
	  } else {
		data.links.push(normalized);
	  }

	  fs.mkdirSync(path.dirname(p), { recursive: true });
	  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
	}

	/** Zentrale used-Counter erhÃ¶hen (für ausgewählte IDs) */
	function bumpCentralNetworkUsage(projectRoot: string, usedIds: string[]) {
	  if (!usedIds || usedIds.length === 0) return;
	  const p = pathCentralNetwork(projectRoot);
	  const data = safeReadJson<CentralNetworkJson>(p);
	  if (!data || !Array.isArray(data.links)) return;

	  let changed = false;
	  for (const id of usedIds) {
		const it = data.links.find(l => l.id === id);
		if (it) {
		  it.used = (it.used ?? 0) + 1;
		  changed = true;
		}
	  }
	  if (changed) {
		fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
	  }
	}

	/** String-Normalisierung für Matching */
	function normalizeStr(s: string, opts?: { caseInsensitive?: boolean; stripDiacritics?: boolean }): string {
	  let out = String(s || "");
	  if (opts?.stripDiacritics) out = out.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	  if (opts?.caseInsensitive !== false) out = out.toLowerCase();
	  return out;
	}

	/** Keyword-Matching (exact/phrase/regex) */
	function keywordMatches(
	  mainKeyword: string,
	  entryKw: string,
	  match: "exact" | "phrase" | "regex",
	  opts: { caseInsensitive?: boolean; stripDiacritics?: boolean }
	): boolean {
	  const a = normalizeStr(mainKeyword, opts);
	  const b = normalizeStr(entryKw, opts);
	  try {
		if (match === "regex") return new RegExp(entryKw).test(mainKeyword);
		if (match === "exact") return a === b;
		// default: phrase
		return a.includes(b) || b.includes(a);
	  } catch {
		return false;
	  }
	}

	/** Scoring für Netzwerk-Linkauswahl */
	function scoreNetworkLink(
	  n: NetworkLink,
	  mainKeyword: string,
	  category: string,
	  language: string,
	  opts: { caseInsensitive?: boolean; stripDiacritics?: boolean }
	): number {
	  let score = 0;
	  const kws = n.keywords || [];
	  if (kws.some(k => keywordMatches(mainKeyword, k.kw, (k.match || "phrase"), opts))) score += 2;
	  if ((n.categories || []).includes(category)) score += 1;
	  if (!n.language || n.language === language) score += 1;
	  return score;
	}

	/** Auswahl passender Netzwerk-Links (Konflikte mit intern, je group nur ein Link) */
	function pickNetworkLinks(
	  all: NetworkLink[],
	  params: {
		mainKeyword: string;
		category: string;
		language: string,
		reservedInternal: Set<string>;
		max: number;
		matchOpts: { caseInsensitive?: boolean; stripDiacritics?: boolean };
	  }
	): NetworkLink[] {
	  const { mainKeyword, category, language, reservedInternal, max, matchOpts } = params;
	  const takenGroups = new Set<string>();
	  const reserved = new Set<string>(Array.from(reservedInternal).map(k => normalizeStr(k, matchOpts)));

	  const scored = all
		.map(n => ({ n, s: scoreNetworkLink(n, mainKeyword, category, language, matchOpts) }))
		.filter(x => x.s > 0)
		.sort((a, b) => {
		  const ua = (a.n.used ?? 0), ub = (b.n.used ?? 0);
		  if (b.s !== a.s) return b.s - a.s;     // hÃ¶herer Score zuerst
		  if (ua !== ub) return ua - ub;         // dann weniger benutzt zuerst
		  return (a.n.title || "").localeCompare(b.n.title || "");
		});

	  const picked: NetworkLink[] = [];
	  for (const { n } of scored) {
		if (picked.length >= max) break;

		// Konflikt mit internen Keywords vermeiden
		const kws = (n.keywords || []).map(k => normalizeStr(k.kw, matchOpts));
		if (kws.some(k => reserved.has(k))) continue;

		// pro group nur eine Seite
		const grp = n.group || null;
		if (grp && takenGroups.has(grp)) continue;

		picked.push(n);
		if (grp) takenGroups.add(grp);
	  }
	  return picked;
	}

	/** Absolute Artikel-URL aus SITE_URL + Pfad bauen */
	function buildArticleUrl(siteUrl: string | undefined, articlePath: string): string {
	  const base = (siteUrl || "").replace(/\/+$/, "");
	  const pathPart = articlePath.startsWith("/") ? articlePath : `/${articlePath}`;
	  return base ? `${base}${pathPart}` : pathPart; // Fallback relativ
	}

	/** Gruppen-Key aus Keyword (für Dedupe über ähnliche Keywords) */
	function makeGroupFromKeyword(kw: string): string {
	  const base = kw
		.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/Ã¤/g, "ae").replace(/Ã¶/g, "oe").replace(/Ã¼/g, "ue").replace(/ÃŸ/g, "ss")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
	  return `kw:${base}`;
	}


	/* ======================================================================== */
	/* =                     INLINE LINKING (NETWORK)                          = */
	/* ======================================================================== */

	/** Sichere Regex-Escapes für Literale */
	function escapeRe(lit: string) {
	  return String(lit).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}

	/** Einfache Erkennung, ob wir gerade innerhalb eines Code-Fence sind */
	function buildNonCodeFenceReplacer(fn: (line: string, i: number) => string | null) {
	  return (md: string) => {
		const lines = md.split(/\r?\n/);
		let inFence = false;
		for (let i = 0; i < lines.length; i++) {
		  const L = lines[i];
		  // Toggle bei ``` oder ~~~
		  if (/^\s*(```|~~~)/.test(L)) { inFence = !inFence; continue; }
		  if (inFence) continue;
		  const rep = fn(L, i);
		  if (rep != null) { lines[i] = rep; return lines.join("\n"); }
		}
		return md;
	  };
	}

	/** In Zeilen, die KEINE Ãœberschrift/Quote/Liste sind und keinen Link enthalten */
	function isInlineCandidateLine(line: string) {
	  const L = line || "";
	  if (/^\s{0,3}#{1,6}\s/.test(L)) return false;  // # H*
	  if (/^\s{0,3}[-*+]\s/.test(L)) return false;   // - list
	  if (/^\s{0,3}\d+\.\s/.test(L)) return false;   // 1. list
	  if (/^\s{0,3}>\s/.test(L)) return false;       // > quote
	  if (/^\s*\|.*\|\s*$/.test(L)) return false;    // | table |
	  if (/\[(.*?)\]\((.*?)\)/.test(L)) return false; // schon Markdown-Link
	  if (/[<>]/.test(L)) return false;              // HTML-Zeile â€“ wird separat behandelt
	  if (/!\[.*?\]\(.*?\)/.test(L)) return false;   // Markdown-Bild
	  return true;
	}



	/** Wählt einen Anchor-Text für den Netzwerkkandidaten (natürlich, kurz) 
	function pickAnchorTextForCandidate(cand: NetworkLink | undefined | null, fallback: string): string {
	  if (!cand) return fallback;
	  const kw = ((cand.keywords ?? []) as any[]).find(k => Array.isArray(k?.anchor) && k.anchor.length);
	  if (kw?.anchor?.[0]) return String(kw.anchor[0]);
	  if (cand.title) {
		const t = String(cand.title).replace(/\s+/g, " ").trim();
		if (t.length <= 60) return t;
		return t.slice(0, 57) + "â€¦";
	  }
	  return fallback;
	}
*/

	/**
	 * Versucht, GENAU EINEN Inline-Link im ersten passenden Absatz zu setzen.
	 * - verlinkt nur, wenn kein interner Konflikt besteht (haben wir vorher schon gefiltert)
	 * - modifiziert hÃ¶chstens eine Zeile (erste passende)
	 * - returns: { mdNew, inserted } â€” inserted = true, wenn ersetzt wurde
	 */
	function insertInlineNetworkLinkOnce(
	  md: string,
	  cand: NetworkLink | undefined | null,
	  mainKeyword: string,
	  matchOpts: { caseInsensitive?: boolean; stripDiacritics?: boolean } = {}
	): { mdNew: string; inserted: boolean } {
	  if (!cand || !cand.url) return { mdNew: md, inserted: false };

	  const ci = matchOpts?.caseInsensitive;
	  const flags: "g" | "gi" = (ci === false ? "g" : "gi");

	  const phrases: string[] = [
		...(((cand.keywords ?? []) as any[]).map(k => k?.kw).filter(Boolean) as string[]),
		mainKeyword
	  ].filter(Boolean);

	  const anchorText = mainKeyword;

	  // 1) Bevorzugt: innerhalb von <p>â€¦</p> genau einmal im Text (keine Tags/Attribute) ersetzen
	  const pTry = insertInlineInHtmlParagraphs(md, cand.url, anchorText, phrases, flags);
	  if (pTry.inserted) return pTry;

	// 2) Fallback: Nur in â€žPlaintextâ€œ-Zeilen (keine HTML/Code/Tabellen/etc.)
	const tryReplace = buildNonCodeFenceReplacer((line) => {
	  if (!isInlineCandidateLine(line)) return null;
	  for (const ph of phrases) {
		const needle = escapeRe(ph);
		const re = new RegExp(`\\b(${needle})\\b`, flags);
		if (re.test(line)) {
		  let once = false; // nur ein einziges Match verlinken
		  const replaced = line.replace(re, (m) => {
			if (once) return m;      // weitere Matches unverändert lassen
			once = true;
			return `[${m}](${cand!.url})`; // m = exakt der gefundene Original-Text
		  });
		  if (replaced !== line) return replaced;
		}
	  }
	  return null;
	});


	  const mdNew = tryReplace(md);
	  const inserted = mdNew !== md;
	  return { mdNew, inserted };
	}


	/** Ersetzt genau EINMAL im Text-Inhalt von <p>â€¦</p>, ohne HTML-Tags/Attribute anzufassen */
	function insertInlineInHtmlParagraphs(
	  md: string,
	  url: string,
	  anchorText: string,
	  phrases: string[],
	  flags: "g" | "gi"
	): { mdNew: string; inserted: boolean } {
	  if (!phrases.length) return { mdNew: md, inserted: false };

	  const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
	  let m: RegExpExecArray | null;
	  let lastIndex = 0;
	  let out = "";
	  let inserted = false;

	  while ((m = pRe.exec(md)) !== null) {
		const before = md.slice(lastIndex, m.index);
		const inner = m[1]; // Inhalt des <p>â€¦</p>

		// nicht anfassen, wenn schon ein Link im Absatz ist (optional, für dezente Verlinkung)
		if (!inserted) {
		  const parts = inner.split(/(<[^>]+>)/g); // Tags vs. Text
		  for (let i = 0; i < parts.length && !inserted; i++) {
			const segment = parts[i];
			if (segment.startsWith("<")) continue; // nur Textsegmente
			for (const ph of phrases) {
			  const needle = escapeRe(ph);
			  const re = new RegExp(`\\b(${needle})\\b`, flags);
			  if (re.test(segment)) {
				// â€¦
				let replacedOnce = false; // nur EINMAL pro Absatz
				const replaced = segment.replace(
				  re,
				  (m) => {
					if (replacedOnce) return m;
					replacedOnce = true;
					// m = genau der Text, der im Absatz steht (inkl. Groß-/Kleinschreibung)
					return `<a href="${url}">${escapeHtml(m)}</a>`;
				  }
				);



				if (replaced !== segment) {
				  parts[i] = replaced;
				  inserted = true;
				  break;
				}
			  }
			}
		  }
		  if (inserted) {
			const newInner = parts.join("");
			out += before + `<p>${newInner}</p>`;
		  } else {
			out += before + m[0]; // unverändert
		  }
		} else {
		  out += before + m[0];
		}

		lastIndex = pRe.lastIndex;
	  }

	  if (lastIndex === 0) {
		// kein <p>â€¦</p> gefunden
		return { mdNew: md, inserted: false };
	  }

	  out += md.slice(lastIndex);
	  return { mdNew: out, inserted };
	}


	/* ======================================================================== */
	/* =                     INTERNAL INLINE LINKING                           = */
	/* ======================================================================== */

	type InternalLinkCandidate = {
	  title: string;
	  url: string;
	  keywords: string[]; // [mainKeyword, ...synonyms]
	};

	/** Baut absolute Artikel-URL. Falls du bereits buildArticleUrl(siteUrl, path) hast, nutze die! */
	function buildInternalArticleUrl(siteUrl: string | undefined | null, category: string, slug: string) {
	  const rel = `/${category}/${slug}`;
	  if (!siteUrl) return rel;
	  try { return new URL(rel, siteUrl).toString(); } catch { return rel; }
	}

	/** Liest _registry.json und erzeugt interne Link-Kandidaten (ohne Self-Link) */
	function buildInternalLinkCandidates(
	  projectRoot: string,
	  siteId: string,
	  siteUrl: string | undefined | null,
	  currentCategory: string,
	  currentSlug: string
	): InternalLinkCandidate[] {
	  const reg = readRegistry(projectRoot, siteId);
	  const out: InternalLinkCandidate[] = [];
	  if (!reg?.items?.length) return out;

	  for (const it of reg.items) {
		if (!it?.slug || !it?.category || !it?.mainKeyword) continue;
		// Self-Link vermeiden
		if (String(it.slug) === String(currentSlug) && String(it.category) === String(currentCategory)) continue;

		const url = buildInternalArticleUrl(siteUrl, String(it.category), String(it.slug));
		const kws = [String(it.mainKeyword)]
		  .concat(Array.isArray(it.synonyms) ? it.synonyms.map(String) : [])
		  .filter(Boolean);

		if (!kws.length) continue;
		out.push({ title: it.title ?? it.mainKeyword, url, keywords: kws });
	  }

	  return out;
	}

	/** Versucht EINEN Inline-Link (intern) zu setzen.
	 *  Verhalten:
	 *   - bevorzugt in <p>â€¦</p> (nur Text, keine Attribute/Tags), Linktext = der GEFUNDENE Originaltext
	 *   - Fallback: Plaintext-Zeilen (Markdown), Linktext = gefundener Originaltext
	 *   - ersetzt maximal 1x, gibt matchedPhrase zurück
	 */
	function insertInlineInternalLinkOnce(
	  md: string,
	  url: string,
	  phrases: string[],
	  flags: "g" | "gi"
	): { mdNew: string; inserted: boolean; matchedPhrase?: string } {
	  if (!phrases?.length) return { mdNew: md, inserted: false };

	  // 1) bevorzugt: <p>â€¦</p>
	  let matched: string | undefined;
	  const pTry = (function insertInlineInHtmlParagraphsWithMatch(
		md0: string,
		url0: string,
		phrases0: string[],
		flags0: "g" | "gi"
	  ): { mdNew: string; inserted: boolean } {
		const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
		let m: RegExpExecArray | null;
		let lastIndex = 0;
		let out = "";
		let inserted = false;

		while ((m = pRe.exec(md0)) !== null) {
		  const before = md0.slice(lastIndex, m.index);
		  const inner = m[1];

		  if (!inserted) {
			const parts = inner.split(/(<[^>]+>)/g); // Tags vs. Text
			for (let i = 0; i < parts.length && !inserted; i++) {
			  const segment = parts[i];
			  if (segment.startsWith("<")) continue; // nur Textsegmente
			  for (const ph of phrases0) {
				const needle = escapeRe(ph);
				const re = new RegExp(`\\b(${needle})\\b`, flags0);
				if (re.test(segment)) {
				  let once = false;
				  const replaced = segment.replace(re, (mm) => {
					if (once) return mm;
					once = true;
					matched = mm; // gematchter Originaltext
					return `<a href="${url0}">${escapeHtml(mm)}</a>`;
				  });
				  if (replaced !== segment) {
					parts[i] = replaced;
					inserted = true;
					break;
				  }
				}
			  }
			}
			if (inserted) {
			  const newInner = parts.join("");
			  out += before + `<p>${newInner}</p>`;
			} else {
			  out += before + m[0];
			}
		  } else {
			out += before + m[0];
		  }

		  lastIndex = pRe.lastIndex;
		}

		if (lastIndex === 0) return { mdNew: md0, inserted: false }; // kein <p>
		out += md0.slice(lastIndex);
		return { mdNew: out, inserted };
	  })(md, url, phrases, flags);

	  if (pTry.inserted) return { ...pTry, matchedPhrase: matched };

	  // 2) Fallback: Plaintext-Zeilen (kein HTML/Code)
	  const tryReplace = buildNonCodeFenceReplacer((line) => {
		if (!isInlineCandidateLine(line)) return null;
		for (const ph of phrases) {
		  const needle = escapeRe(ph);
		  const re = new RegExp(`\\b(${needle})\\b`, flags);
		  if (re.test(line)) {
			let once = false;
			const replaced = line.replace(re, (mm) => {
			  if (once) return mm;
			  once = true;
			  matched = mm;
			  return `[${mm}](${url})`;
			});
			if (replaced !== line) return replaced;
		  }
		}
		return null;
	  });

	  const mdNew = tryReplace(md);
	  const inserted = mdNew !== md;
	  return { mdNew, inserted, matchedPhrase: inserted ? matched : undefined };
	}






/* ======================================================================== */
/* =                          TYPES & HELPERS                              = */
/* ======================================================================== */

// 3.3.2 — Output-Sprache hart erzwingen (für alle AI-Calls)
function outputLanguageInstruction(language: string): string {
  const lang = String(language).trim().toLowerCase();

  const map: Record<string, string> = {
    de: "Schreibe den Output ausschließlich auf Deutsch.",
    en: "Write the output exclusively in English.",
    fr: "Écris la sortie exclusivement en français.",
    es: "Escribe la salida exclusivamente en español.",
    it: "Scrivi l'output esclusivamente in italiano.",
    pt: "Escreve a saída exclusivamente em português.",
    nl: "Schrijf de output uitsluitend in het Nederlands.",
    pl: "Napisz wynik wyłącznie po polsku.",
    sv: "Skriv utdata enbart på svenska.",
    da: "Skriv output udelukkende på dansk.",
    no: "Skriv output utelukkende på norsk.",
    fi: "Kirjoita tulos ainoastaan suomeksi.",
    cs: "Napiš výstup výhradně česky.",
    hu: "Írd a kimenetet kizárólag magyarul.",
    tr: "Çıktıyı yalnızca Türkçe yaz.",
    ja: "出力は日本語のみで書いてください。",
    hi: "आउटपुट केवल हिंदी में लिखें।",
    ar: "اكتب المخرجات باللغة العربية فقط.",
    he: "כתוב את הפלט בעברית בלבד.",
    ko: "출력은 한국어로만 작성하세요.",
    zh: "输出请仅使用中文。",
    ru: "Пишите вывод только на русском языке."
  };

  const instr = map[lang];
  if (!instr) {
    // STRICT: Kein Fallback. Wenn hier was Unbekanntes ankommt, ist das ein Bug im Flow.
    throw new Error(`Konfigurationsfehler: Keine Output-Language-Instruktion für "${lang}".`);
  }
  return instr;
}



type KBProduct = {
  asin: string;
  name: string;            // neutraler Name
  title: string;           // Amazon-Titel
  buyUrl: string;          // Affiliate-Link
  imgAmazon: string;       // Amazon-Bild
  imgAmazonWidth?: number;
  imgAmazonHeight?: number;
  imgAi: string;           // KI-Bild (Hero)
  paRaw?: any;             // PA-API Roh
};

type AiCopy = {
  title: string;
  heroIntro: string;
  keyTakeaways: string[];
  criteria: { heading: string; body: string }[];
  pros: string[];
  cons: string[];
  faq: { q: string; a: string }[];
  conclusion: string;
  seoTitle: string;
  metaDescription: string;
  table?: { headers: string[]; rows: string[][] };
  productDetails?: Array<{ summary: string; bestFor?: string; keyFeatures?: string[] }>;
};

/* ======================================================================== */
/* =                       SITE CATEGORIES (CONFIG + AI)                   = */
/* ======================================================================== */

type SiteCategory = { id: string; slug: string; title: string };


/**
 * Lässt OpenAI die passende Kategorie bestimmen.
 * Erwartet strenge JSON-Antwort: {"slug":"<einer-der-gültigen-slugs>"}
 * KEIN Fallback â€“ wirft klare Fehlermeldungen.
 */
async function chooseCategoryWithAI(
  mainKeyword: string,
  categories: SiteCategory[],
  language: string
): Promise<SiteCategory> {
  if (!mainKeyword || !mainKeyword.trim()) {
    throw new Error("Kategorieauswahl fehlgeschlagen: 'mainKeyword' fehlt oder ist leer.");
  }
  const client = getOpenAI();
  if (!client) {
    throw new Error("Kategorieauswahl erfordert OpenAI: 'OPENAI_API_KEY' fehlt oder ist ungültig.");
  }
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new Error("Kategorieauswahl fehlgeschlagen: 'categories' ist leer.");
  }

  // WICHTIG: wir geben dem Modell die IDs (nicht nur slug), weil wir {"categoryId":"..."} erwarten
  const catList = categories
    .map(c => ({ id: c.id, slug: c.slug, title: c.title }))
    .slice(0, 20);

  const sys = (() => {
    const lang = String(language).trim().toLowerCase();

    const SYS_PROMPTS: Record<string, string> = {
      de: `Du bist ein Klassifikator für Kategorien auf einer Affiliate-Website. Wähle die passendste Kategorie für ein Keyword.
Gib NUR valides JSON zurück: {"categoryId":"..."}.
Keine Erklärungen, kein Text außerhalb von JSON.`,

      en: `You are a category classifier for an affiliate website. Pick the single best category for a keyword.
Return ONLY valid JSON: {"categoryId":"..."}.
No explanations, no extra text.`,

      fr: `Tu es un classificateur de catégories pour un site d’affiliation. Choisis la meilleure catégorie pour un mot-clé.
Retourne UNIQUEMENT du JSON valide : {"categoryId":"..."}.
Aucune explication, aucun texte en dehors du JSON.`,

      es: `Eres un clasificador de categorías para un sitio de afiliación. Elige la mejor categoría para una palabra clave.
Devuelve SOLO JSON válido: {"categoryId":"..."}.
Sin explicaciones ni texto extra.`,

      it: `Sei un classificatore di categorie per un sito di affiliazione. Scegli la migliore categoria per una parola chiave.
Restituisci SOLO JSON valido: {"categoryId":"..."}.
Nessuna spiegazione, nessun testo extra.`,

      pt: `Você é um classificador de categorias para um site de afiliados. Escolha a melhor categoria para uma palavra-chave.
Retorne APENAS JSON válido: {"categoryId":"..."}.
Sem explicações, sem texto extra.`,

      nl: `Je bent een categorie-classificator voor een affiliate-website. Kies de beste categorie voor een zoekwoord.
Geef ALLEEN geldige JSON terug: {"categoryId":"..."}.
Geen uitleg, geen extra tekst.`,

      pl: `Jesteś klasyfikatorem kategorii dla strony afiliacyjnej. Wybierz najlepszą kategorię dla słowa kluczowego.
Zwróć WYŁĄCZNIE poprawny JSON: {"categoryId":"..."}.
Bez wyjaśnień i bez dodatkowego tekstu.`,

      sv: `Du är en kategoriklassificerare för en affiliate-webbplats. Välj den bästa kategorin för ett sökord.
Returnera ENDAST giltig JSON: {"categoryId":"..."}.
Inga förklaringar, ingen extra text.`,

      da: `Du er en kategoriklassificering for en affiliate-hjemmeside. Vælg den bedste kategori for et søgeord.
Returnér KUN gyldig JSON: {"categoryId":"..."}.
Ingen forklaring, ingen ekstra tekst.`,

      no: `Du er en kategoriklassifiserer for en affiliate-nettside. Velg den beste kategorien for et søkeord.
Returner KUN gyldig JSON: {"categoryId":"..."}.
Ingen forklaringer, ingen ekstra tekst.`,

      fi: `Olet kategorioiden luokittelija affiliate-sivustolle. Valitse paras kategoria avainsanalle.
Palauta VAIN kelvollinen JSON: {"categoryId":"..."}.
Ei selityksiä, ei ylimääräistä tekstiä.`,

      cs: `Jsi klasifikátor kategorií pro affiliate web. Vyber nejlepší kategorii pro klíčové slovo.
Vrať POUZE platné JSON: {"categoryId":"..."}.
Bez vysvětlení, bez dalšího textu.`,

      hu: `Kategória-osztályozó vagy egy affiliate weboldalhoz. Válaszd ki a legjobb kategóriát a kulcsszóhoz.
Csak érvényes JSON-t adj vissza: {"categoryId":"..."}.
Nincs magyarázat, nincs extra szöveg.`,

      tr: `Bir satış ortaklığı sitesi için kategori sınıflandırıcısısın. Anahtar kelime için en uygun tek kategoriyi seç.
SADECE geçerli JSON döndür: {"categoryId":"..."}.
Açıklama yok, ek metin yok.`,

      ja: `あなたはアフィリエイトサイトのカテゴリ分類器です。キーワードに最も適したカテゴリを1つ選んでください。
返すのは有効なJSONのみ: {"categoryId":"..."}。
説明や余計な文章は禁止。`,

      hi: `आप एक एफिलिएट वेबसाइट के लिए श्रेणी वर्गीकरणकर्ता हैं। कीवर्ड के लिए सबसे उपयुक्त एक श्रेणी चुनें।
केवल वैध JSON लौटाएँ: {"categoryId":"..."}।
कोई व्याख्या नहीं, अतिरिक्त टेक्स्ट नहीं।`,

      ar: `أنت مُصنِّف فئات لموقع أفلييت. اختر أفضل فئة واحدة للكلمة المفتاحية.
أعد JSON صالحًا فقط: {"categoryId":"..."}.
بدون شرح وبدون نص إضافي.`,

      he: `את/ה מסווג/ת קטגוריות לאתר אפיליאציה. בחר/י את הקטגוריה המתאימה ביותר למילת המפתח.
החזר/י רק JSON תקין: {"categoryId":"..."}.
בלי הסברים ובלי טקסט נוסף.`,

      ko: `당신은 제휴 사이트의 카테고리 분류기입니다. 키워드에 가장 적합한 카테고리 하나를 선택하세요.
유효한 JSON만 반환: {"categoryId":"..."}.
설명/추가 텍스트 금지.`,

      zh: `你是一个联盟网站的分类器。为关键词选择最匹配的一个分类。
只返回有效 JSON：{"categoryId":"..."}。
不要解释，不要输出额外文本。`,

      ru: `Ты — классификатор категорий для партнёрского сайта. Выбери одну лучшую категорию для ключевого слова.
Верни ТОЛЬКО валидный JSON: {"categoryId":"..."}.
Без объяснений и без лишнего текста.`
    };

    const s = SYS_PROMPTS[lang];
    if (!s) {
      // STRICT: kein Fallback
      throw new Error(`Konfigurationsfehler: chooseCategoryWithAI hat keinen Sys-Prompt für language="${lang}".`);
    }
    return s;
  })();

  const user = { mainKeyword, categories: catList };

  let txt = "";
  try {
    const r = await withTimeout(
      client.chat.completions.create({
        model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: JSON.stringify(user) }
        ],
        response_format: { type: "json_object" } as any,
        max_completion_tokens: 200
      }),
      20000
    );
    txt = r.choices?.[0]?.message?.content ?? "";
  } catch (err: any) {
    throw new Error(
      `Kategorieauswahl fehlgeschlagen: OpenAI-Antwort nicht erhalten (${String(err?.message || err)}).`
    );
  }

  let parsed: any;
  try {
    parsed = tryParseJsonStrict(txt);
  } catch {
    throw new Error(
      `Kategorieauswahl fehlgeschlagen: OpenAI lieferte kein valides JSON. Antwort war: ${truncate(String(txt), 300)}`
    );
  }

  // FIX: Wir erwarten categoryId (oder legacy slug) – STRICT kein Fallback
  const picked = String(parsed?.categoryId ?? parsed?.slug ?? "").trim();
  if (!picked) {
    throw new Error(
      `Kategorieauswahl fehlgeschlagen: 'categoryId' fehlt in OpenAI-Antwort. Antwort war: ${truncate(
        JSON.stringify(parsed),
        300
      )}`
    );
  }

  // categoryId kann entweder categories[i].id ODER categories[i].slug sein
  const match = categories.find(c => c.id === picked || c.slug === picked);
  if (!match) {
    const valid = categories.map(c => c.id).join(", ");
    throw new Error(`Kategorieauswahl fehlgeschlagen: Unbekannte categoryId='${picked}'. Gültig sind: ${valid}`);
  }

  return match;
}


/**
 * Legt (falls fehlend) Intro-Dateien pro Kategorie an:
 * Pfad: sites/<siteId>/content/_category/<slug>.mdx  (z. B. rasen.mdx)
 */

async function ensureCategoryIntroFiles(
  projectRoot: string,
  siteId: string,
  categories: SiteCategory[],
  language: string,
  promptContext: {
    brandName: string;
    topicDomain: string;
    brandDescription: string;
    voice: string;
    positioning: string;
  }
) {
  const baseDir = path.join(projectRoot, "sites", siteId, "content", "_category");
  ensureDir(baseDir);

  // Lokale Helfer (unabhängig von globalen Funktionen)
  const decodeHtmlEntities = (str: string) =>
    String(str ?? "")
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/&#(\d+);/g, (_m, d) => String.fromCodePoint(parseInt(d, 10)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#039;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");

  const fixMojibake = (s: string) =>
    String(s ?? "")
      .replace(/ÃƒÂ¼/g, "Ã¼").replace(/ÃƒÂ¶/g, "Ã¶").replace(/ÃƒÂ¤/g, "Ã¤")
      .replace(/ÃƒÅ“/g, "Ãœ").replace(/Ãƒâ€“/g, "Ã–").replace(/Ãƒâ€ž/g, "Ã„")
      .replace(/ÃƒÅ¸/g, "ÃŸ")
      .replace(/Ã¢â‚¬â€œ/g, "â€“").replace(/Ã¢â‚¬â€/g, "â€”")
      .replace(/Ã¢â‚¬Å¾/g, "â€ž").replace(/Ã¢â‚¬Å“/g, "â€œ").replace(/Ã¢â‚¬ï¿½/g, "â€")
      .replace(/Ã¢â‚¬Ëœ/g, "â€˜").replace(/Ã¢â‚¬â„¢/g, "â€™")
      .replace(/Ã¢â‚¬Â¢/g, "â€¢").replace(/Ã¢â‚¬Â¦/g, "â€¦");

  const clean = (txt: string) =>
    fixMojibake(decodeHtmlEntities(String(txt ?? ""))).replace(/\s+/g, " ").trim();

  const client = getOpenAI();

  for (const cat of categories) {
    const outFile = path.join(baseDir, `${cat.slug}.mdx`); // z. B. sites/<id>/content/_category/rasen.mdx
    if (fs.existsSync(outFile)) continue;


const langInstr = outputLanguageInstruction(language);

	// Fallback-Text (falls kein OpenAI verfügbar oder Call scheitert):
	// Wichtig: nicht mehr implizit Deutsch als Default für "alle anderen" Sprachen.
	let body = "";
	if (client) {
	  try {
		const domain = (promptContext.topicDomain || "").trim();
		const brand = (promptContext.brandName || "").trim();
		const voice = (promptContext.voice || "").trim();

		const prompt =
		  `Write ONE concise category introduction paragraph (60–90 words) for the category "${cat.title}".\n` +
		  `Website topic/domain: ${domain || "(not specified)"}\n` +
		  `Brand: ${brand || "(not specified)"}\n` +
		  `Voice: ${voice || "(not specified)"}\n` +
		  `${langInstr}\n` +
		  `No lists. No headings. No code fences.`;

		const resp = await withTimeout(
		  client.chat.completions.create({
			model: process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini",
			messages: [
			  { role: "system", content: `Return only one plain paragraph. ${langInstr}` },
			  { role: "user", content: prompt }
			],
			temperature: 0.3,
			max_completion_tokens: 260
		  }),
		  60000
		);

		const txtRaw = (resp.choices?.[0]?.message?.content ?? "").trim();
		if (txtRaw) {
		  body = clean(txtRaw).replace(/\n+/g, " ");
		}
	  } catch {
		// Falls AI-Call scheitert, bleibt der lokale Standardtext – ok
	  }
	}


    // Frontmatter sicher schreiben (ohne Tabs/Indentation; JSON.stringify zitiert YAML-sicher)
    const fmObj = {
      title: clean(cat.title),
      description: clean(body),
      slug: String(cat.slug || ""),
    };
    const fm =
      `---\n` +
      Object.entries(fmObj).map(([k, v]) => `${k}: ${JSON.stringify(v ?? "")}`).join("\n") +
      `\n---\n` +
      body + `\n`;

    fs.writeFileSync(outFile, fm, "utf8");
  }
}


/* ======================================================================== */
/* =                          AMAZON SPEC EXTRACT                          = */
/* ======================================================================== */

function extractSpecsFromPA(pa: any, titleFallback: string) {
  const title = firstNonEmpty(
    gp(pa, ["ItemInfo","Title","DisplayValue"]),
    gp(pa, ["title"]),
    gp(pa, ["ItemInfo","ProductInfo","Title"]),
    titleFallback
  );

  const brand = firstNonEmpty(
    gp(pa, ["ItemInfo","ByLineInfo","Brand","DisplayValue"]),
    gp(pa, ["brand"])
  );

  const features: string[] =
    gp(pa, ["ItemInfo","Features","DisplayValues"]) ??
    gp(pa, ["features"]) ??
    gp(pa, ["FeatureBullets"]) ?? [];

  // Energieversorgung: NUR aus strukturierten PA-Feldern (PowerSource).
  // Kein Parsing aus Titel/Features, weil das bei Zubehör/Kompatibilität falsche Treffer erzeugt.
  const powerSrc = firstNonEmpty(
    gp(pa, ["ItemInfo","TechnicalInfo","PowerSource","DisplayValue"]),
    gp(pa, ["ItemInfo","TechnicalInfo","PowerSource"]),
    gp(pa, ["ItemInfo","ProductInfo","PowerSource","DisplayValue"]),
    gp(pa, ["ItemInfo","ProductInfo","PowerSource"]),
    ""
  );

  const normalizePowerSource = (raw: string): string => {
    const s = String(raw || "").toLowerCase().trim();
    if (!s) return "";

    // Attachment-/Adapter-Produkte: semantisch keine eigene Energieversorgung
    // (Bohrmaschinenpumpe, Aufsätze, Adapter etc.)
    if (/\b(aufsatz|adapter|aufsätze|aufsaetze|für\s+bohrmaschine|fuer\s+bohrmaschine|bohrmaschinenpumpe|bohrmaschinen\-pumpe)\b/.test(s)) {
      return "";
    }

    // Whitelist: nur robuste Kategorien
    if (/\b(akku|rechargeable|lithium|li-ion|li ion)\b/.test(s)) return "Akku";
    if (/\b(batterie|battery)\b/.test(s)) return "Batterie";
    if (/\b(netze|netz|kabel|corded|mains|ac|230v|240v|strom)\b/.test(s)) return "Netzbetrieb";
    if (/\b(benzin|petrol|gasoline|diesel)\b/.test(s)) return "Benzin";
    if (/\b(solar|solarbetrieb)\b/.test(s)) return "Solar";
    if (/\b(manuell|hand|ohne strom|mechanisch)\b/.test(s)) return "Manuell";

    // Unbekannt/zu spezifisch → leer lassen (Spalte kann droppen)
    return "";
  };

  const energy = normalizePowerSource(powerSrc);

    const material = firstNonEmpty(
    gp(pa, ["ItemInfo","TechnicalInfo","Material","DisplayValue"]),
    gp(pa, ["ItemInfo","TechnicalInfo","Material"]),
    gp(pa, ["ItemInfo","ProductInfo","Material","DisplayValue"]),
    gp(pa, ["ItemInfo","ProductInfo","Material"]),
    ""
  );


  // Gewicht: NUR Produktgewicht (ItemWeight). Kein Package/Shipping, kein Text-Parsing.
  const wObj = gp(pa, ["ItemInfo","ProductInfo","ItemWeight"]);

  const wDisp =
    gp(wObj, ["DisplayValue"]) ??
    gp(wObj, ["Amount"]) ??
    gp(wObj, ["Value"]);

  const wUnit =
    gp(wObj, ["Unit"]) ??
    gp(pa, ["ItemInfo","ProductInfo","ItemWeight","Unit"]) ??
    gp(pa, ["ItemInfo","ProductInfo","ItemWeight","DisplayValue"]);

  let weight = "";

  if (wDisp != null) {
    const unit = String(wUnit || "").toUpperCase();
    let val = Number(String(wDisp).replace(",", "."));
    if (!Number.isNaN(val)) {
      // Konvertiere nur bekannte Einheiten nach kg
      if (unit.includes("POUND") || unit === "LB" || unit === "LBS") val = val * 0.45359237;
      else if (unit.includes("OUNCE") || unit === "OZ") val = val * 0.0283495231;
      else if (unit.includes("GRAM") || unit === "G") val = val / 1000;
      else if (unit.includes("KILOGRAM") || unit === "KG" || unit === "KGS" || unit === "") {
        // ok
      } else {
        // Unbekannte Einheit -> lieber leer lassen als falsch
        val = NaN;
      }

      if (!Number.isNaN(val)) {
        weight = `${val.toFixed(1).replace(".", ",")} kg`;
      }
    }
  }

  const aggText = [title, brand, features.join(" ")].join(" • ");
  const cutWidth = parseCutWidth(aggText);
  const usp = pickUSP(features, brand);

  return {
    title: truncate(title || titleFallback, 100),
    brand,
    energy: energy || "",
    cutWidth: cutWidth || "",
    weight: weight || "",
    usp: usp || ""
  };

}

	// Generische Eigenschafts-Extraktion aus Titel/Features/Text
	function collectExtraAttributes(pa: any, title: string, features: string[]): Record<string, string> {
	  const bag: Record<string, string> = {};
	  const parts: string[] = [];
	  const t = (title || "").toString();
	  if (t) parts.push(t);
	  if (Array.isArray(features)) parts.push(...features);
	  const flat = parts.join(" ").replace(/\s+/g, " ").trim();
	  const lower = flat.toLowerCase();

	  const take = (k: string, v?: string | number) => {
		if (v == null) return;
		const s = String(v).trim();
		if (!s) return;
		if (!(k in bag)) bag[k] = s;
	  };
	  const num = (x: string) => x.replace(",", ".");

	  // ---- Farben (allg.) ----
	  const colorHit = lower.match(/\b(gelb|gelben|gelber|yellow|schwarz|weiß|weiss|rot|orange|mehrfarbig|mix|bunt|violett|lila|blau|grün|gruen|creme|beige|anthrazit|natur|braun|grau)\b/);
	  if (colorHit) {
		const c = colorHit[0]
		  .replace(/weiss/g, "weiß").replace(/gruen/g, "grün")
		  .replace(/gelben|gelber/g, "gelb");
		take("farbe", c.charAt(0).toUpperCase() + c.slice(1));
	  }

	  // ---- Pflanzen/Saatgut ----
	  let m;
	  // Menge (g/kg/ml/L) oder Stück/Samen/pcs/Pack/Beutel
	// Menge: nur Stück / Volumen. Gewicht (kg/g) wird als "weight" geführt.
	const fmtKg = (kg: number) => {
	  // 0.250 -> "0,25", 25.000 -> "25"
	  const s = kg.toFixed(3).replace(".", ",").replace(/,?0+$/, "");
	  return `${s} kg`;
	};

	if ((m = lower.match(/\b(\d+(?:[.,]\d+)?)\s?g\b/))) {
	  const g = Number(num(m[1]));
	  if (!Number.isNaN(g)) take("weight", fmtKg(g / 1000));
	}
	else if ((m = lower.match(/\b(\d+(?:[.,]\d+)?)\s?kg\b/))) {
	  const kg = Number(num(m[1]));
	  if (!Number.isNaN(kg)) take("weight", fmtKg(kg));
	}
	else if ((m = lower.match(/\b(\d+(?:[.,]\d+)?)\s?ml\b/))) take("menge", `${num(m[1])} ml`);
	else if ((m = lower.match(/\b(\d+(?:[.,]\d+)?)\s?l\b/))) take("menge", `${num(m[1])} L`);
	else if ((m = lower.match(/\b(\d{1,4})\s?(st(?:ü|u)ck|samen|pcs|beutel|pack|tüten|tueten|tüte|tuete)\b/))) take("menge", `${m[1]} Stück`);
	else if ((m = lower.match(/\b(\d{1,4})\s?samen\b/))) take("menge", `${m[1]} Stück`);


	  if (/\b(bio|ökologisch|organic|de-?öko|eu-?bio)\b/i.test(lower)) take("bio", "Ja");

	  const slicePhrase = (re: RegExp, label: string) => {
		const hit = flat.match(new RegExp(`(.{0,40}${re.source}.{0,40})`, re.flags));
		if (hit && hit[0]) take(label, hit[0].replace(/\s+/g, " ").replace(/[•|–—-]\s*/g, " ").trim());
	  };
	  slicePhrase(/\baussaat\b|\bsäen\b|\bsaat\b/i, "aussaat");
	  slicePhrase(/\bblüte\b|\bblüht\b|\bblütezeit\b|\bbluetezeit\b/i, "blütezeit");
	  slicePhrase(/\bkeimung\b|\bkeim(?:dauer|zeit)\b/i, "keimung");
	  slicePhrase(/\bwuchshöhe\b|\bwuchshoehe\b|\bwird\b.*\bcm\b/i, "wuchshoehe");
	  slicePhrase(/\bstandort\b|\bsonnig\b|\bhalbschatten\b|\bschatten\b/i, "standort");
	  if (/\bwinterh(?:ä|ae)rte\b|\bfrosthart\b|\bwinterhart\b/i.test(lower)) take("winterhärte", "winterhart");

	  if ((m = lower.match(/\btopf(?:größe|groesse|size)\s*:?[\s-]*(\d{1,3})\s?(cm|mm)\b/))) {
		take("topfgroesse", `${num(m[1])} ${m[2]}`);
	  }

	  // ---- Möbel/Outdoor ----
	  if ((m = lower.match(/\b(\d{1,2})\s?(?:personen|sitzpl(?:atz|ätze|aetze)?)\b/))) take("sitzplätze", `${m[1]} Pers.`);
	  if ((m = lower.match(/\b(max(?:\.|imale?r?)\s*)?(traglast|belastbarkeit|load)\s*:?[\s-]*(\d{1,4})(?:[.,](\d+))?\s?kg\b/i))) {
		const val = m[4] ? `${m[3]},${m[4]} kg` : `${m[3]} kg`; take("traglast", val);
	  }
	  if (/\buv-?\s?schutz\b|\buv\s*schutz\b/i.test(lower)) take("uvschutz", "Ja");
	  if ((m = lower.match(/\bip\s?(\d{2})\s?([a-d0-9])?\b/i))) take("ip", `IP${m[1]}${m[2] || ""}`);

	  // ---- Abmessungen (z. B. 200 x 150 x 90 cm) ----
	  const dims = lower.match(/(\d{1,3})(?:\s?[x×]\s?)(\d{1,3})(?:\s?[x×]\s?(\d{1,3}))?\s?(mm|cm|m)\b/);
	  if (dims) {
		const u = dims[4]; const a = num(dims[1]); const b = num(dims[2]); const c = dims[3] ? num(dims[3]) : "";
		take("dimensions", c ? `${a}×${b}×${c} ${u}` : `${a}×${b} ${u}`);
	  }
	  if ((m = lower.match(/\b(?:durchmesser|ø|diameter)\s*:?[\s-]*(\d{1,3})\s?(mm|cm|m)\b/))) take("durchmesser", `${num(m[1])} ${m[2]}`);

	  // ---- Geräte/Leistung/Elektrik ----
	  if ((m = lower.match(/\b(\d{2,4})\s?w\b/))) take("leistung", `${m[1]} W`);
	  if ((m = lower.match(/\b(\d{2,3})\s?v\b/))) take("spannung", `${m[1]} V`);
	  if ((m = lower.match(/\b(\d{1,3})\s?db\b/))) take("lautstaerke", `${m[1]} dB`);
	  if ((m = lower.match(/\b(\d{2,5})\s?lm\b|\blumen\b/))) take("lumen", `${m[1]} lm`);

	  // ---- Bewässerung/Pumpen ----
	  if ((m = lower.match(/\b(\d{1,3}(?:[.,]\d+)?)\s?bar\b/))) take("druck", `${num(m[1])} bar`);
	  if ((m = lower.match(/\b(\d{2,5})\s?(?:l\/h|liter\/stunde)\b/))) take("durchfluss", `${m[1]} L/h`);
	  if ((m = lower.match(/\b(?:schlauch(?:länge|laenge|length))\s*:?[\s-]*(\d{1,3})\s?m\b/))) take("schlauchlaenge", `${m[1]} m`);
	  if ((m = lower.match(/\b(?:anschluss(?:größe|groesse|size)|gewinde)\s*:?[\s-]*(\d(?:\/\d)?)(?:\s?["”]|\s?zoll|\s?")\b/i))) {
		take("anschluss", `${m[1]}"`);
	  }

	  // ---- Grill/Feuer ----
	  if ((m = lower.match(/\b(?:grill(?:fläche|flaeche|area))\s*:?[\s-]*(\d{2,4})\s?cm²?\b/))) take("grillflaeche", `${m[1]} cm²`);
	  if ((m = lower.match(/\b(?:temperatur|hitze)\s*:?[\s-]*(\d{2,3})(?:\s?[-–]\s?(\d{2,3}))?\s?°c\b/))) {
		take("temperatur", m[2] ? `${m[1]}–${m[2]} °C` : `${m[1]} °C`);
	  }
	  if (/\b(holz|kohle|gas|elektro|pellet|brikett)\b/.test(lower)) take("brennstoff", (lower.match(/\b(holz|kohle|gas|elektro|pellet|brikett)\b/) as RegExpMatchArray)[1]);

	  // ---- Spielgeräte/Kinder ----
	  if ((m = lower.match(/\b(?:alter|age)\s*:?[\s-]*(\d{1,2})(?:\s?[-–]\s?(\d{1,2}))?\s?(jahre|years)\b/))) {
		take("alter", m[2] ? `${m[1]}–${m[2]} ${m[3]}` : `${m[1]} ${m[3]}`);
	  }
	  if ((m = lower.match(/\b(?:max(?:\.|imale?r?)\s*)?(nutz(?:er)?gewicht|belastung)\s*:?[\s-]*(\d{1,3})\s?kg\b/i))) {
		take("traglast", `${m[2]} kg`);
	  }

	  return bag;
	}



/** Spalten-Auswahl (Heuristik + Fallback) */
//function normalizeKeyword(s: string) {
//  return (s || "").toLowerCase();
//}



	function pickAuthorId(siteCfg: any, seed: string): string {
	  const authors = siteCfg?.authors;
	  if (!Array.isArray(authors) || authors.length === 0) {
		throw new Error("Konfigurationsfehler: authors fehlt/leer in super-config");
	  }

	  // OPTIONAL: expliziter Default in config (empfohlen für “immer gleicher Autor”)
	  const preferred = siteCfg?.prompts?.defaultAuthorId;
	  if (preferred) {
		const ok = authors.some((a: any) => a?.id === preferred);
		if (!ok) throw new Error(`Konfigurationsfehler: prompts.defaultAuthorId="${preferred}" existiert nicht in authors[]`);
		return preferred;
	  }

	  // Deterministische Auswahl (kein Random)
	  let h = 0;
	  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
	  return String(authors[h % authors.length].id);
	}



/* ======================================================================== */
/* =                      BRAND/MODEL STRING HELPER                        = */
/* ======================================================================== */

/** "Marke Produkt Modell" aus PA/Title ableiten â€“ ohne Ellipsen, kurz & sauber */
/** "Marke Produkt Modell" â€“ kurz & sauber, mit Keyword-Hinweis */
function buildBrandModel(
  pa: any,
  fallbackTitle: string,
  fallbackName = "",
  keyword?: string
): string {
  const brand = firstNonEmpty(
    gp(pa, ["ItemInfo","ByLineInfo","Brand","DisplayValue"]),
    gp(pa, ["brand"]),
    ""
  ).trim();

  const rawTitle = firstNonEmpty(
    gp(pa, ["ItemInfo","Title","DisplayValue"]),
    fallbackTitle,
    fallbackName
  );

  const title = String(rawTitle || "").trim();

  // --- 1) Kategorie/Synonyme erkennen ---
  const L = (keyword ? `${keyword} ${title}` : title).toLowerCase();

  const CANON_TYPES: Record<string, string> = {
    "hochbeet": "Hochbeet",
    "pflanzkasten": "Hochbeet",
    "pflanzkuebel": "Hochbeet",
    "pflanzkübel": "Hochbeet",
    "frühbeet": "Hochbeet",
    "fruehbeet": "Hochbeet",
    "kräuterbeet": "Hochbeet",
    "kraeuterbeet": "Hochbeet",

    "mähroboter": "Mähroboter",
    "maehroboter": "Mähroboter",
    "rasenroboter": "Mähroboter",

    "rasenmäher": "Rasenmäher",
    "rasenmaeher": "Rasenmäher",
    "rasentrimmer": "Rasentrimmer",
    "heckenschere": "Heckenschere",
    "kettensäge": "Kettensäge",
    "kettensaege": "Kettensäge",
  };

  let type = "";
  for (const k in CANON_TYPES) {
    if (L.includes(k)) { type = CANON_TYPES[k]; break; }
  }

  // --- 2) Aussagekräftige Adjektive (max 1) ---
  const ADJ = ["rechteckig", "rund", "eckig", "kompakt"];
  const adj = ADJ.find(a => L.includes(a)) || "";

  // --- 3) Feature-Phrasen ---
  const features: string[] = [];
  if (/\bohne\s+begrenzungskabel\b/i.test(title)) features.push("ohne Begrenzungskabel");

  // --- 4) Modellextraktion (Großbuchstaben/Ziffern & bekannte Marker) ---
  // Wir nehmen Tokens, die "modell-typisch" wirken, aber filtern Maße/FarbwÃ¶rter raus.
  const EXCLUDE = /\b(\d+\s?(cm|mm|m|l|kg|w|v|bar)\b|[0-9]+x[0-9]+(x[0-9]+)?\s?(cm|mm)?\b|schwarz|weiß|weiss|grau|anthrazit|silber|braun|grün|blau|beige|natur)\b/i;
  const MODEL_MARKERS = /(mini|pro|max|plus|se|awD|awd|luba|netrtk|\b[0-9]{2,4}\b|[A-Z]{2,}|[A-Z0-9\-]{2,})/;

  // Titel in WÃ¶rter (Originalreihenfolge)
  const words = title.split(/[\s,;:/|]+/).filter(Boolean);

  // Wenn eine Marke vorne steht, dahinter schauen
  let startIdx = 0;
  if (brand && words[0] && words[0].toLowerCase().startsWith(brand.toLowerCase())) {
    startIdx = 1;
  }

  const modelTokens: string[] = [];
  for (let i = startIdx; i < words.length; i++) {
    const w = words[i];
    const lw = w.toLowerCase();
    if (EXCLUDE.test(w)) continue;           // Maße/Farben/Einheiten raus
    if (/^\d+x\d+/.test(lw)) continue;       // 180x90x60cm etc. raus
    if (MODEL_MARKERS.test(w)) modelTokens.push(w);
    // Begrenzung: nicht zu lang
    if (modelTokens.length >= 6) break;
  }

  // Spezialfall: Wenn Type leer ist, versuche erstes sinnvolles Hauptwort
  if (!type) {
    const fallbackType = (title.match(/\b(Hochbeet|Mähroboter|Rasenmäher|Rasentrimmer|Heckenschere|Kettensäge)\b/i) || [])[0];
    if (fallbackType) type = fallbackType;
  }

  // Mammotion-Beispiel: Re-Ordering "Mähroboter" + Feature + Modell
  // ok-living-Beispiel: "Hochbeet rechteckig" (ohne Synonym-Redundanz)
  const parts = [
    brand || "",
    type || "",
    adj || "",
    ...(features.length ? [features.join(" ")] : []),
    ...(modelTokens.length ? [modelTokens.join(" ")] : []),
  ].filter(Boolean);

  // Doppelte Whitespaces kappen
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// ======================================================================
// Step V: Header i18n (Keys -> Labels pro Sprache)
// ======================================================================

const TABLE_HEADER_I18N: Record<string, Record<string, string>> = {
  // EN: bewusst knapp, generisch für viele Nischen
  en: {
    modell: "Model",
    energieversorgung: "Power supply",
    leistung: "Power",
    kapazitaet: "Capacity",
    gewicht: "Weight",
    dimensions: "Dimensions",
    material: "Material",
    menge: "Quantity",
    anzahl: "Count",
    farbe: "Color",
    besonderheit: "Features",
    schnittbreite: "Cutting width",
    arbeitsbreite: "Working width",
    volumen: "Volume",
    reichweite: "Range",
    lautstaerke: "Noise",
    batterie: "Battery",
    akkukapazitaet: "Battery capacity",
    ladezeit: "Charging time",
    spannung: "Voltage"
  },

  // FR: optional (wenn du FR nutzt, ansonsten egal)
  fr: {
    modell: "Modèle",
    energieversorgung: "Alimentation",
    leistung: "Puissance",
    kapazitaet: "Capacité",
    gewicht: "Poids",
    dimensions: "Dimensions",
    material: "Matériau",
    menge: "Quantité",
    anzahl: "Nombre",
    farbe: "Couleur",
    besonderheit: "Points forts",
    schnittbreite: "Largeur de coupe",
    arbeitsbreite: "Largeur de travail",
    volumen: "Volume",
    reichweite: "Portée",
    lautstaerke: "Bruit",
    batterie: "Batterie",
    akkukapazitaet: "Capacité batterie",
    ladezeit: "Temps de charge",
    spannung: "Tension"
  }
};

function tTableHeader(key: string, language: string): string {
  const lang = String(language || "de").trim().toLowerCase();
  const raw = String(key || "").trim();
  if (!raw) return raw;

  const k0 = raw.toLowerCase();
  const k1 = k0.replace(/[^a-z0-9]/gi, "");

  const labelsAny = (TABLE_SCHEMA as any)?.labels;
  const dict = labelsAny?.[lang] || (lang !== "de" ? null : labelsAny?.de);

  // Kein Sprachmix: wenn fr nicht existiert -> raw zurück (nicht de)
  if (!dict) return raw;

  return dict[k0] || dict[k1] || raw;
}


	function chooseTableColumnsAndRows(
	  keyword: string,
	  prods: KBProduct[],
	  opts?: { raw?: boolean } // Step V: raw = keys statt Labels
	): { headers: string[]; rows: string[][] } {


	  const kw = (keyword || "").toLowerCase();

	  // Hilfsfunktion: kurze, prägnante Modellbezeichnung (Marke + Modell/Serie), max. 50 Zeichen
	  function shortenModelTitle(fullTitle: string, brand: string): string {
		const t = (fullTitle || "").trim();
		const b = (brand || "").trim();

		// Entferne überflüssige Zusätze/Noise aus Amazon-Titeln
		let core = t
		  // Klammerinhalte, z. B. GrÃ¶ßenangaben
		  .replace(/\s*\([^)]*\)/g, " ")
		  // Nach Doppelpunkt/Strich wird oft Marketing/Shop-Info angehängt
		  .split(" - ")[0]
		  .split(" | ")[0]
		  .split(":")[0]
		  .trim();

		// Falls Marke nicht vorn steht, voranstellen
		if (b && !core.toLowerCase().startsWith(b.toLowerCase())) {
		  core = `${b} ${core}`;
		}

		// Extrem lange Ketten (z. B. 5+ WÃ¶rter) ein wenig stutzen
		const words = core.split(/\s+/);
		if (words.length > 9) {
		  core = words.slice(0, 9).join(" ");
		}

		// Hartes Limit
		if (core.length > 50) core = core.slice(0, 47).trimEnd() + "â€¦";
		return core.trim();
	  }




	  // 1) Roh-Attribute je Produkt zusammenstellen
	  const enriched = prods.map(p => {
		const pa = p.paRaw || {};
		const title = firstNonEmpty(gp(pa, ["ItemInfo","Title","DisplayValue"]), p.title, p.name, p.asin);
		const features: string[] =
		  gp(pa, ["ItemInfo","Features","DisplayValues"]) ?? gp(pa, ["features"]) ?? [];
		const basic = extractSpecsFromPA(pa, p.title);
	const specBasic = {
	  brand: basic.brand || "",
	  weight: basic.weight,
	  energieversorgung: basic.energy,
	  schnittbreite: basic.cutWidth,
	  usp: basic.usp,
	  title: p.title || title
	};
		const extra = collectExtraAttributes(pa, title, features);
		const merged = { ...specBasic, ...extra };

		// Produktgewicht (ItemWeight) hat immer Vorrang vor Content-Weight aus Textheuristik
		if (specBasic.weight) merged.weight = specBasic.weight;

		const spec = filterSpecForTable(normalizeSpecKeys(merged));

		return { p, spec };

	

	  });

	  // 2) Kaufrelevante Prioritäten (eng am Entscheidungsnutzen ausgerichtet)
	  //    â†’ Modell (immer), dann nach Kategorie-Booster, dann sinnvolle Fallbacks

	// Leer-/Platzhalter-Werte zuverlässig erkennen
	const isEmptySpecVal = (v: any): boolean => {
	  if (v === null || v === undefined) return true;
	  const s0 = String(v);
	  const s = s0.trim();
	  if (!s) return true;

	  // Mojibake / kaputte Platzhalter aus früheren Runs
	  if (s === "â€”" || s === "â€“" || s === "â€¢" || s === "”" || s === "â€") return true;

	  // reine Striche/Em-/En-Dash, "—", "-", "–"
	  if (/^(\u2014|\u2013|—|–|-)+$/.test(s)) return true;

	  // häufige Platzhalter/Noise
	  if (/^(n\/a|k\.a\.|unknown)$/i.test(s)) return true;

	  return false;
	};



	// 3) Verfügbarkeit je Attribut zählen (Platzhalter NICHT mitzählen)
	const availability: Record<string, number> = {};

	for (const { spec } of enriched as Array<{ spec: ProductSpec }>) {
	  const s = spec as Record<string, unknown>;
	  for (const k of Object.keys(s)) {
		const v = s[k];
		if (isEmptySpecVal(v)) continue;      // ⬅️ NEU: "-" / "—" / "" zählen NICHT
		if (!availability[k]) availability[k] = 0;
		availability[k]++;
	  }
	}

	// === Kontext grob erkennen (Samen/Pflanzen?) ============================
	const ctxText = enriched
	  .map(({ p, spec }) => `${p?.title || ""} ${p?.brand || ""} ${String((spec as any)?.title || "")}`)
	  .join(" ")
	  .toLowerCase();



	// === HEADERS: immer mit "Modell" beginnen ===============================
	const headers: string[] = ["Modell"];

	// Bevorzugte Liste (Werkzeug-lastig) nur nutzen, wenn NICHT Samen-Kontext
	  const preferred = preferredKeysForKeyword(keyword);
	const MAX_COLS = 1 + TABLE_SCHEMA.limits.maxColumns; // +1 wegen "Modell"
	for (const key of preferred) {
	  
	  if (headers.length >= MAX_COLS) break;

	  if (key === "title" || key === "brand") continue; // steckt im Modell
	  if (availability[key] && availability[key] > 0) {
		headers.push(key);
	  }
	}


	const scoreKey = (key: string): number => {
	  const vals = enriched
		.map(e => String((e.spec as any)[key] ?? ""))
		.filter(Boolean);

	  let s = 0;
	  for (const v of vals) {
		if (/\d/.test(v)) s += 1; // Zahl
		if (/\b(mm|cm|m|g|kg|ml|l|st|stück|pcs|db)\b/i.test(v)) s += 1; // Einheit
		if (v.length >= 3) s += 0.5; // nicht zu kurz
	  }


	  return s;
	};


	if (headers.length < MAX_COLS) {
	  const remaining = Object.keys(availability)
		.filter(
		  (k) =>
			k !== "title" &&
			k !== "brand" &&
			!headers.includes(k) &&
			(availability[k] || 0) > 0
		)
		.sort((a, b) => {
		  const ca = availability[a] || 0;
		  const cb = availability[b] || 0;
		  if (cb !== ca) return cb - ca;       // 1) häufiger zuerst
		  return scoreKey(b) - scoreKey(a);    // 2) informativer zuerst
		});

	  for (const k of remaining) {
		if (headers.length >= MAX_COLS) break;
		headers.push(k);
	  }
	}

		
		// Falls nach Ranking immer noch <5 Spalten: weitere echte Keys nach Häufigkeit auffüllen
	if (headers.length < 5) {
	  const fallbackMore = Object.keys(availability)
		.filter(k => k !== "title" && k !== "brand" && !headers.includes(k) && (availability[k] || 0) > 0)
		.sort((a, b) => (availability[b] || 0) - (availability[a] || 0));
	  for (const k of fallbackMore) {
		if (headers.length >= MAX_COLS) break;

		headers.push(k);
	  }
	}


	// KEINE künstlichen Platzhalterspalten hinzufügen
	// while (headers.length < 5) headers.push("—");

	// === ROWS: Zellen befüllen (Modell = Marke + Titel; Rest echte Werte/leer) ===

	// kleiner Sanitizer für Umlaute/typografische Zeichen & „—“→leer
	const sanitize = (input: any): string => {
	  if (input == null) return "";
	  let s = String(input).trim();
	  // Platzhalter-/Strich-only → leer
	  if (/^(\u2014|\u2013|—|–|-)+$/.test(s)) return "";
	  // häufige Mojibake & typografische Zeichen
	  s = s
		.replace(/\u2026/g, "...")                           // … → ...
		.replace(/[\u2012\u2013\u2014\u2212]/g, "-")        // ‒–—− → -
		.replace(/\u2022/g, "-")                             // • → -
		.replace(/â€¦/g, "...").replace(/â€“|â€”/g, "-").replace(/â€¢/g, "-")
		.replace(/â€š/g, "‚").replace(/â€ž/g, "„").replace(/â€œ/g, "“").replace(/â€/g, "”")
		.replace(/â€™/g, "’").replace(/â€˜/g, "‘")
		.replace(/Ã¼/g, "ü").replace(/Ãœ/g, "Ü").replace(/Ã¶/g, "ö").replace(/Ã–/g, "Ö")
		.replace(/Ã¤/g, "ä").replace(/Ã„/g, "Ä").replace(/ÃŸ/g, "ß")
		.replace(/\s+/g, " ");
	  return s;
	};

	// Modellanzeige: Marke + Produktbezeichnung (ASCII-sicher)
	const displayName = (p: any, s: Record<string, unknown>): string => {
	  const brandRaw = s["brand"] ?? p.brand ?? "";
	  const titleRaw = s["title"] ?? p.title ?? p.name ?? "";

	  let brand = sanitize(brandRaw);
	  let title = sanitize(titleRaw);

	  if (brand && title.toLowerCase().startsWith(brand.toLowerCase())) {
		title = title.slice(brand.length).trim().replace(/^[-–:,.\s]+/, "");
	  }
	  return (brand && title) ? `${brand} ${title}` : (title || brand || p.asin || "");
	};

	const rows = enriched.map(({ p, spec }) => {
	  const cells: string[] = [];
	  const s = spec as Record<string, unknown>;

	  for (const h of headers) {
		if (h === "Modell") {
		  cells.push(displayName(p, s));
		  continue;
		}
		if (h === "Preis") {
		  cells.push(""); // leer statt —
		  continue;
		}
		const v = s[h as string];
		cells.push(sanitize(v));
	  }
	  return cells;
	});

	return {
	  headers: opts?.raw
		? headers
		: headers.map(h => (h === "Modell" ? "Modell" : labelHeader(h, language))),
	  rows
	};
	}




type ProductKind = "physical_product";
function classifyArticleKind(_keyword: string, _prods: KBProduct[]): ProductKind {
  // SAFE: Deine Sites enthalten ausschließlich physische Produkte.
  return "physical_product";
}

type ColumnSpec = {
  key: string;        // raw header key aus chooseTableColumnsAndRows(..., { raw:true })
  priority: number;   // kleinere Zahl = weiter vorne
};




// ======================================================================
// Step IV: Normalisierung + Quality Gates für Vergleichstabelle
// ======================================================================

function isEmptyish(v: string): boolean {
  const raw = String(v ?? "").trim();
  if (!raw) return true;

  // Mojibake / kaputte Platzhalter
  if (raw === "â€”" || raw === "â€“" || raw === "â€¢" || raw === "”" || raw === "â€") return true;

  const s = raw.toLowerCase();
  return (
    s === "-" || s === "—" || s === "–" || s === "n/a" || s === "na" ||
    s === "k.a." || s === "ka" || s === "nicht verfügbar" || s === "nicht verfuegbar" ||
    s === "unknown" || s === "unbekannt" || s === "keine angabe" || s === "ohne angabe"
  );
}


function normSpaces(v: string): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function parseFirstNumber(v: string): number | null {
  // SAFE: akzeptiert "1,2", "1.2", "1200W", "1 200"
  const s = String(v ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const m = s.match(/-?\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d+)?|-?\d+(?:[.,]\d+)?/);
  if (!m) return null;

  const raw = m[0]
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")   // Tausenderpunkt entfernen
    .replace(/,(?=\d)/g, ".");       // Dezimalkomma -> Punkt

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeNumericWithUnit(key: string, v: string): string {
  const s = normSpaces(v);
  const n = parseFirstNumber(s);
  if (n == null) return normSpaces(v);

  const low = s.toLowerCase();

  // Gewicht: g -> kg
  if (key === "gewicht") {
    if (low.includes(" g") || low.endsWith("g")) {
      const kg = n / 1000;
      return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)} kg`;
    }
    if (low.includes("kg")) return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} kg`;
    return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
  }

  // Leistung: kW -> W
  if (key === "leistung") {
    if (low.includes("kw")) return `${Math.round(n * 1000)} W`;
    if (low.includes("w")) return `${Math.round(n)} W`;
    return `${Math.round(n)}`;
  }

  // Kapazität: ml -> l (nur grob)
  if (key === "kapazitaet") {
    if (low.includes("ml")) {
      const l = n / 1000;
      return `${l % 1 === 0 ? l.toFixed(0) : l.toFixed(2)} l`;
    }
    if (low.includes("l")) return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)} l`;
    return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
  }

  // Menge/Anzahl: integerisieren
  if (key === "menge" || key === "anzahl") {
    return `${Math.round(n)}`;
  }

  // Dimensions: wir lassen meist den Text, säubern nur Spaces
  if (key === "dimensions") {
    return normSpaces(v);
  }

  return normSpaces(v);
}

function normalizeBoolean(v: string): string {
  const s = String(v ?? "").trim().toLowerCase();
  const yes = new Set(["ja", "yes", "y", "true", "✔", "✅", "vorhanden", "inkl.", "inklusive", "mit"]);
  const no  = new Set(["nein", "no", "n", "false", "✘", "❌", "nicht", "ohne"]);

  if (yes.has(s)) return "Ja";
  if (no.has(s)) return "Nein";
  return normSpaces(v);
}

function normalizeCellValue(headerKey: string, v: string): string {
  if (isEmptyish(v)) return "";

  const key = String(headerKey ?? "").toLowerCase();

  // FIX: Zahlen/Einheiten nur auf bekannte Keys anwenden
  if (key === "gewicht" || key === "leistung" || key === "kapazitaet" || key === "menge" || key === "anzahl" || key === "dimensions") {
    return normalizeNumericWithUnit(key, v);
  }

  // Optional: booleans auf "besonderheit" o.ä. ist riskant; wir wenden es nur an, wenn sehr kurz
  const s = normSpaces(v);
  if (s.length <= 6) return normalizeBoolean(s);

  // Default: einfach säubern
  // Guard: extrem lange Texte in Tabellenzellen kürzen (UX)
  if (s.length > 140) return s.slice(0, 140) + "…";
  return s;
}

function applyQualityGates(
  headersRaw: string[],
  rows: string[][],
  opts?: { maxEmptyRatio?: number }
): { headers: string[]; rows: string[][] } {
  const maxEmptyRatio = opts?.maxEmptyRatio ?? 0.60;

  if (headersRaw.length === 0) return { headers: headersRaw, rows };

  // Modell-Spalte behalten
  const keepIdx: number[] = [];
  const hLower = headersRaw.map(h => String(h).toLowerCase());
  const modelIdx = hLower.indexOf("modell");
  if (modelIdx >= 0) keepIdx.push(modelIdx);

  for (let c = 0; c < headersRaw.length; c++) {
    if (c === modelIdx) continue;

    let empty = 0;
    const vals: string[] = [];

    for (let r = 0; r < rows.length; r++) {
      const v = rows[r]?.[c] ?? "";
      if (isEmptyish(v)) empty++;
      else vals.push(String(v).trim());
    }

    const ratio = rows.length ? empty / rows.length : 1;

    // Gate 1: zu viele leere Werte
    if (ratio > maxEmptyRatio) continue;

    // Gate 2: keine Varianz (alle gleichen Werte)
    const uniq = new Set(vals.map(x => x.toLowerCase()));
    if (uniq.size <= 1) continue;

    // Gate 3: Zellen sind "zu textig" (oft KI-/Bullet-Müll)
    const avgLen = vals.length ? (vals.reduce((a, b) => a + b.length, 0) / vals.length) : 0;
    if (avgLen > 70) continue;

    keepIdx.push(c);
  }

  // Rebuild
  const newHeaders = keepIdx.map(i => headersRaw[i]);
  const newRows = rows.map(r => keepIdx.map(i => r?.[i] ?? ""));
  return { headers: newHeaders, rows: newRows };
}

// ======================================================================
// Step VI: Policy-safe Table Contracts (Amazon/Privacy/Copyright)
// ======================================================================

function looksLikeUrl(s: string): boolean {
  return /https?:\/\/|www\./i.test(s);
}

function stripHtml(s: string): string {
  // SAFE: minimaler Strip, keine HTML-Parser-Abhängigkeit
  return String(s ?? "").replace(/<[^>]*>/g, "").trim();
}

function sanitizeCellForPolicy(s: string): string {
  let v = normSpaces(stripHtml(s));
  if (!v) return "";

  // Entferne URLs aus Zellen (Affiliate-Link ist separat, nicht in Zellen)
  if (looksLikeUrl(v)) return "";

  // Datenschutz: primitive PII-Pattern raus (sollte nicht vorkommen, aber harden)
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(v)) return "";
  if (/\b(\+?\d[\d\s().-]{7,}\d)\b/.test(v)) return ""; // Telefon-like

  // Urheber/Policy: keine langen Marketingtexte in Tabellenzellen
  if (v.length > 140) v = v.slice(0, 140) + "…";
  return v;
}

function isPriceLikeHeaderKey(h: string): boolean {
  const k = normDe(h).toLowerCase();
  return (
    k.includes("preis") ||
    k.includes("price") ||
    k.includes("prix") ||
    k.includes("costo") ||
    k.includes("cost") ||
    k.includes("prezzo") ||
    k.includes("precio") ||
    k.includes("koster") ||
    k.includes("kostnad") ||
    k.includes("pris") ||
    k.includes("eur") ||
    k.includes("€")
  );
}

function isRatingLikeHeaderKey(h: string): boolean {
  const k = normDe(h).toLowerCase();
  return (
    k.includes("bewertung") ||
    k.includes("rating") ||
    k.includes("sterne") ||
    k.includes("stars") ||
    k.includes("étoile") ||
    k.includes("avis") ||
    k.includes("reviews") ||
    k.includes("rezension") ||
    k.includes("review") ||
    k.includes("bewertungen")
  );
}

function enforceTableContracts(
  headersRaw: string[],
  rows: string[][],
  opts?: { minColsInclModel?: number; minRows?: number; maxColsInclModel?: number }
): { headers: string[]; rows: string[][]; meta: { dropped: string[]; fallbackUsed: boolean } } {
  const minColsInclModel = opts?.minColsInclModel ?? 4; // Modell + 3 Specs
  const minRows = opts?.minRows ?? 3;
  const maxColsInclModel = opts?.maxColsInclModel ?? 7;

  const dropped: string[] = [];
  let fallbackUsed = false;

  // 1) Spalten filtern: Preis/Rating grundsätzlich droppen (Policy-safe Default)
  const keepIdx: number[] = [];
  const lower = headersRaw.map(h => normDe(h).toLowerCase());
  const modelIdx = lower.indexOf("modell");

  for (let i = 0; i < headersRaw.length; i++) {
    const hk = headersRaw[i] ?? "";
    const isModel = i === modelIdx || normDe(hk).toLowerCase() === "modell";
    if (isModel) {
      keepIdx.push(i);
      continue;
    }

    if (isPriceLikeHeaderKey(hk)) { dropped.push(`${hk}:price_like`); continue; }
    if (isRatingLikeHeaderKey(hk)) { dropped.push(`${hk}:rating_like`); continue; }

    keepIdx.push(i);
  }

  let h2 = keepIdx.map(i => headersRaw[i]);
  let r2 = rows.map(r => keepIdx.map(i => r?.[i] ?? ""));

  // 2) Zellen sanitizen (URLs/HTML/PII/Long text)
  r2 = r2.map(row => row.map(sanitizeCellForPolicy));

  // 3) Mindest-Row-Anzahl (sonst ist Vergleich wertlos) -> deterministischer Minimal-Fallback
  if (r2.length < minRows) {
    fallbackUsed = true;
    // Minimal: nur Modell (wenn vorhanden) + 2 weitere Spalten, falls da
    h2 = h2.slice(0, Math.min(maxColsInclModel, Math.max(1, minColsInclModel)));
    r2 = r2.slice(0, minRows);
  }

  // 4) Mindest-Spalten-Anzahl (Modell + X)
  if (h2.length < minColsInclModel) {
    fallbackUsed = true;
    // nichts „erfinden“: wir lassen es schlank; Step III/IV hat bereits Fallback aufgefüllt.
    // hier nur Guard, keine Exception
  }

  // 5) Max-Spalten-Hardcap
  if (h2.length > maxColsInclModel) {
    h2 = h2.slice(0, maxColsInclModel);
    r2 = r2.map(row => row.slice(0, maxColsInclModel));
  }

  return { headers: h2, rows: r2, meta: { dropped, fallbackUsed } };
}



function chooseTableColumnsAndRowsByType(
  _kind: ProductKind, // aktuell immer "physical_product"
  keyword: string,
  prods: KBProduct[]
): { headers: string[]; rows: string[][] } {
  // 1) Basis-Tabelle in RAW (Keys, nicht Labels)
  const base = chooseTableColumnsAndRows(keyword, prods, { raw: true });
  const rawHeaders = base.headers;
  const rawRows = base.rows;

  // 2) Spec-Keys, die wirklich verfügbar sind
  const available = new Set(rawHeaders.map(h => h.toLowerCase()));
  const selected: string[] = ["Modell"];

  for (const s of PHYSICAL_SPEC.slice().sort((a, b) => a.priority - b.priority)) {
    if (selected.length >= 7) break; // FIX: max 7 Spalten inkl. Modell
    if (available.has(s.key.toLowerCase())) selected.push(s.key);
  }

  // 3) Deterministisch auffüllen, falls Spec zu wenig liefert
  for (const h of rawHeaders) {
    if (selected.length >= 7) break;
    if (h === "Modell") continue;
    if (selected.some(x => x.toLowerCase() === h.toLowerCase())) continue;
    selected.push(h);
  }

  // 4) Rows neu bauen: nur ausgewählte Spalten (Index-Mapping)
  const idxByHeader = new Map<string, number>();
  rawHeaders.forEach((h, i) => idxByHeader.set(h.toLowerCase(), i));

  let newHeadersRaw = selected.slice();
  let newRows = rawRows.map(r => newHeadersRaw.map(h => {
    const idx = idxByHeader.get(h.toLowerCase());
    return idx == null ? "" : (r[idx] ?? "");
  }));

  // 5) Step IV: Zellwerte normalisieren
  newRows = newRows.map(row => row.map((cell, i) => {
    const hk = newHeadersRaw[i] ?? "";
    return normalizeCellValue(hk, cell);
  }));

  // 6) Step IV: Quality Gates (Spalten droppen, wenn wertlos)
  const gated = applyQualityGates(newHeadersRaw, newRows, { maxEmptyRatio: 0.60 });
  newHeadersRaw = gated.headers;
  newRows = gated.rows;

  // 7) Fallback: wenn nach Gates zu wenig Vergleichsspalten übrig sind, deterministisch auffüllen
  //    Ziel: mind. 4 Spalten inkl. Modell (also 3 Vergleichsspalten)
  if (newHeadersRaw.length < 4) {
    const refill = ["Modell"];
    for (const h of rawHeaders) {
      if (refill.length >= 6) break; // keep etwas kleiner, nach Gates kann wieder reduziert werden
      if (h === "Modell") continue;
      if (refill.some(x => x.toLowerCase() === h.toLowerCase())) continue;
      refill.push(h);
    }
    newHeadersRaw = refill;

    newRows = rawRows.map(r => newHeadersRaw.map(h => {
      const idx = idxByHeader.get(h.toLowerCase());
      return idx == null ? "" : normalizeCellValue(h, (r[idx] ?? ""));
    }));

    const gated2 = applyQualityGates(newHeadersRaw, newRows, { maxEmptyRatio: 0.60 });
    newHeadersRaw = gated2.headers;
    newRows = gated2.rows;
  }

// 8) Step VI: Policy-safe Contracts (Preis/Rating droppen, Zellen sanitizen, Hardcaps)
const enforced = enforceTableContracts(newHeadersRaw, newRows, {
  minColsInclModel: 4,
  minRows: 3,
  maxColsInclModel: 7
});

if (process.env.DEBUG_TABLE === "1") {
  // SAFE: nur Metadaten loggen, keine paRaw/keine langen Inhalte
  console.log("[table] enforced", {
    headers: enforced.headers,
    dropped: enforced.meta.dropped.slice(0, 12),
    fallbackUsed: enforced.meta.fallbackUsed,
    rows: enforced.rows.length
  });
}

return {
  headers: enforced.headers.map(labelHeader),
  rows: enforced.rows
};

}


/* ======================================================================== */
/* =                            IMAGE GENERATION                           = */
/* ======================================================================== */

async function generateAiImageFile(
  client: OpenAI,
  {
    prompt,
    model,
    size,
    quality,
    outPath
  }: {
    prompt: string;
    model: string;
    size: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
    quality: "low" | "medium" | "high";
    outPath: string;
  }
): Promise<void> {
  const resp = await withTimeout(
    client.images.generate({ model, prompt, size, quality, n: 1 }),
    90000
  );

  const b64 = (resp as any)?.data?.[0]?.b64_json;
  if (b64) {
    fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
    return;
  }

  const url = (resp as any)?.data?.[0]?.url;
  if (!url) throw new Error("no image in response");

  const r = await fetch(url as string);
  if (!r.ok) throw new Error(`download url failed: ${r.status}`);

  const ab = await r.arrayBuffer();
  fs.writeFileSync(outPath, Buffer.from(ab));
}





/* ======================================================================== */
/* =                          AI TEXT GENERATION                           = */
/* ======================================================================== */
// ====== TITLE CANDIDATES (clickbait + SEO) ======
type TitleCandidateOpts = {
  textModel: string;
  min?: number; // min Titelanzahl
  max?: number; // max Titelanzahl
};

function dedupeTitles(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of list.map(s => (s || "").trim()).filter(Boolean)) {
    const k = t.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(t); }
  }
  return out;
}

/** simple length score: sweet spot ~ 45â€“65 chars (German SERP-tauglich) */
function scoreLen(s: string) {
  const n = s.length;
  if (n >= 45 && n <= 65) return 20;
  if (n >= 35 && n <= 75) return 12;
  if (n >= 25 && n <= 85) return 6;
  return 0;
}



	function isBuyingIntent(t: string, language: string): boolean {
	  const T = String(t || "").toLowerCase();
	  const lang = String(language).trim().toLowerCase();

	  const TERMS: Record<string, RegExp> = {
		de: /(kaufberatung|vergleich|ratgeber|guide|test)\b/i,

		en: /(best|top|review|reviews|comparison|compare|buying guide|buyer'?s guide|guide)\b/i,

		fr: /(comparatif|comparaison|guide d['’]achat|guide|avis|meilleur)\b/i,

		es: /(comparativa|comparación|gu[ií]a de compra|gu[ií]a|rese[nñ]a|mejor)\b/i,

		it: /(confronto|comparazione|guida all['’]acquisto|guida|recensione|miglior)\b/i,

		pt: /(comparação|comparativo|guia de compra|guia|análise|melhor)\b/i,

		nl: /(vergelijking|vergelijk|koopgids|gids|review|beste)\b/i,

		pl: /(porównanie|ranking|recenzja|najlepszy|przewodnik|poradnik)\b/i,

		sv: /(jämförelse|bäst|test|köpguide|guide|recension)\b/i,

		da: /(sammenligning|bedst|test|købsguide|guide|anmeldelse)\b/i,

		no: /(sammenligning|best|test|kjøpsguide|guide|anmeldelse)\b/i,

		fi: /(vertailu|paras|testi|osto-opas|opas|arvostelu)\b/i,

		cs: /(srovnání|nejlepší|test|průvodce|recenze|návod)\b/i,

		hu: /(összehasonlítás|legjobb|teszt|vásárlási útmutató|útmutató|értékelés)\b/i,

		tr: /(karşılaştırma|en iyi|inceleme|satın alma rehberi|rehber)\b/i,

		ja: /(比較|おすすめ|レビュー|購入ガイド|ガイド)\b/i,

		hi: /(तुलना|समीक्षा|रिव्यू|खरीद गाइड|गाइड|सबसे अच्छा)\b/i,

		ar: /(مقارنة|أفضل|مراجعة|دليل شراء|دليل)\b/i,

		he: /(השוואה|הכי טוב|ביקורת|סקירה|מדריך קנייה|מדריך)\b/i,

		ko: /(비교|추천|리뷰|구매 가이드|가이드|최고)\b/i,

		zh: /(对比|比较|推荐|评测|测评|购买指南|指南|最好)\b/i,

		ru: /(сравнение|лучший|обзор|отзыв|гид по покупке|руководство)\b/i,
	  };

	  const re = TERMS[lang];
	  if (!re) {
		throw new Error(`Konfigurationsfehler: isBuyingIntent hat keine Regeln für language="${lang}".`);
	  }
	  return re.test(T);
	}

	/** Heuristik-Scorer: Keyword, Zahlen, Klammern, Intent, Strafpunkte */
	function scoreTitle(t: string, keyword: string, language: string): number {
	  const s = String(t || "").trim();
	  let sc = 0;
	  const T = s.toLowerCase();
	  const K = String(keyword || "").trim().toLowerCase();

	  sc += scoreLen(s);

	  if (K && T.includes(K)) sc += 22;

	  // Buying-Intent
	  if (isBuyingIntent(s, language)) sc += 18;

	  // Zahlen / Klammern
	  if (/\d/.test(s)) sc += 6;
	  if (/[([][^)\]]+[)\]]/.test(s)) sc += 4;

	  // “Power terms” pro Sprache (zusätzlich zum BuyingIntent)
	  const lang = String(language).trim().toLowerCase();
	  const POWER: Record<string, RegExp> = {
		de: /(vergleich|kaufberatung|ratgeber|guide|checkliste|tipps|test)\b/i,
		en: /(comparison|compare|buying guide|buyer'?s guide|review|guide|checklist|tips)\b/i,
		fr: /(comparatif|comparaison|guide|avis|checklist)\b/i,
		es: /(comparativa|comparación|gu[ií]a|rese[nñ]a|lista)\b/i,
		it: /(confronto|comparazione|guida|recensione|lista)\b/i,
		pt: /(comparação|comparativo|guia|análise|lista)\b/i,
		nl: /(vergelijking|koopgids|gids|review|checklist)\b/i,
		pl: /(porównanie|ranking|poradnik|recenzja|lista)\b/i,
		sv: /(jämförelse|köpguide|guide|recension|checklista)\b/i,
		da: /(sammenligning|købsguide|guide|anmeldelse|tjekliste)\b/i,
		no: /(sammenligning|kjøpsguide|guide|anmeldelse|sjekkliste)\b/i,
		fi: /(vertailu|osto-opas|opas|arvostelu|tarkistuslista)\b/i,
		cs: /(srovnání|průvodce|recenze|seznam)\b/i,
		hu: /(összehasonlítás|útmutató|értékelés|lista)\b/i,
		tr: /(karşılaştırma|rehber|inceleme|liste)\b/i,
		ja: /(比較|おすすめ|レビュー|ガイド|チェックリスト)\b/i,
		hi: /(तुलना|गाइड|समीक्षा|सूची)\b/i,
		ar: /(مقارنة|دليل|مراجعة|قائمة)\b/i,
		he: /(השוואה|מדריך|סקירה|רשימה)\b/i,
		ko: /(비교|리뷰|가이드|체크리스트)\b/i,
		zh: /(对比|比较|评测|测评|指南|清单)\b/i,
		ru: /(сравнение|обзор|руководство|гид|список)\b/i,
	  };

	  const powerRe = POWER[lang];
	  if (!powerRe) {
		throw new Error(`Konfigurationsfehler: scoreTitle hat keine POWER-Regeln für language="${lang}".`);
	  }
	  if (powerRe.test(s)) sc += 6;

	  // Strafpunkte (sprachneutral)
	  if ((s.match(/!/g) || []).length > 1) sc -= 8;
	  if (/[A-ZÄÖÜ]{6,}/.test(s)) sc -= 6;
	  if (s.length > 90) sc -= 10;
	  if (/[\|\-–—]\s*[\|\-–—]/.test(s)) sc -= 4;

	  // DE-only: “Tipps” ohne Intent leicht runter
	  if (lang === "de" && /tipps?/i.test(s) && !isBuyingIntent(s, language)) sc -= 8;

	  return sc;
	}




function forbidden(t: string): boolean {
  // â€žTextâ€œ (genau das Wort) nie erlauben
  if (/\btext\b/i.test(t)) return true;
  // reine â€ž5 Tipps â€¦â€œ ohne Buying-Intent rauswerfen
  if (/^\s*\d+\s+tipps?/i.test(t) && !isBuyingIntent(t, language)) return true;
  return false;
}

function hardFilterForbidden(titles: string[], forbiddenWords: string[]) {
  if (!forbiddenWords?.length) return titles;

  return titles.filter(t => {
    const l = t.toLowerCase();
    return !forbiddenWords.some(w => l.includes(w.toLowerCase()));
  });
}


function pickBestTitle(
  cands: string[],
  keyword: string,
  language: string
): string {
  const cleaned = dedupeTitles(cands)
    .map(x => x.replace(/\s+/g, " ").trim())
    .filter(x => !forbidden(x));

  // STRICT: kein sprachlicher Fallback (insb. kein Deutsch)
  if (cleaned.length === 0) {
    throw new Error(`AI-Fehler: Keine gültigen Titelkandidaten für keyword="${keyword}"`);
  }

  let best = cleaned[0];
  let bestScore = -1e9;

  for (const t of cleaned) {
    const sc = scoreTitle(t, keyword, language);
    if (sc > bestScore) {
      bestScore = sc;
      best = t;
    }
  }

  return best;
}




/** Lässt OpenAI 4â€“8 Titel liefern (Deutsch, klickstark aber nicht spammy) */
async function generateTitleCandidates(
  language: string,
  keyword: string,
  products: KBProduct[],
  opts: TitleCandidateOpts
): Promise<string[]> {
  const client = getOpenAI();
  if (!client) return [];
  const min = Math.max(4, Math.min(8, opts?.min ?? 6));
  const max = Math.max(min, Math.min(8, opts?.max ?? 8));
  const model = opts?.textModel || process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";

	const langInstr = outputLanguageInstruction(language);

	const sys =
	`You are an SEO title generator.

	LANGUAGE (hard):
	- ${langInstr}

	RULES (hard):
	- Return ONLY valid JSON: {"titles":["..."]}.
	- No explanations, no markdown, no code fences.
	- Titles must be concise, non-spammy, click-worthy.
	`;


  const productHints = products.map(p => p.title || p.name || p.asin).slice(0, 6);

// SAFE: generateTitleCandidates läuft ohne Request-Kontext.
// StyleProfile wird hier bewusst NICHT geladen, um req/siteId Abhängigkeit zu vermeiden.


  const user = {
  language,
  mainKeyword: keyword,
constraints: {
  count: { min, max },
  length: { sweetSpot: "45-65 chars" },
  mustContainKeyword: true,
  // FIX: kein DE-Zwang, sonst werden EN-Titel rausgefiltert → DE-Fallback greift
  style: "clear buying intent (buying guide/comparison), concise, non-spammy, max 1 exclamation mark, no ALL CAPS."
},

  contextProducts: productHints,
    // 🟢 Neu: Stil-Kontext aus style.config.json


};

  const r = await withTimeout(
    client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: JSON.stringify(user) }
      ],
      response_format: { type: "json_object" } as any,
      max_completion_tokens: 300
    }),
    30000
  );

  const raw = r.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = tryParseJsonStrict(raw);
    const arr = Array.isArray(parsed?.titles) ? parsed.titles.map(String) : [];
    return dedupeTitles(arr).slice(0, max);
  } catch {
    return [];
  }
}



// === Robust JSON helpers (sanitizer + best-effort parse) ===
function stripCodeFences(raw: string): string {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  return raw.trim();
}
function extractLargestJsonObject(raw: string): string {
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s >= 0 && e > s) return raw.slice(s, e + 1);
  return raw;
}
function normalizeQuotes(raw: string): string {
  return raw.replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
            .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"');
}
function repairJson(raw: string): string {
  let s = raw.replace(/^\uFEFF/, "");
  s = normalizeQuotes(s);
  s = stripCodeFences(s);
  s = extractLargestJsonObject(s);
  s = s.replace(/,\s*([\]}])/g, "$1");
  s = s.replace(/([{\s,])([A-Za-z0-9_]+)\s*:/g, (_m, p1, key) => `${p1}"${key}":`);
  s = s.replace(/'([^']*)'/g, (_m, g1) => `"${g1.replace(/"/g, '\\"')}"`);
  return s.trim();
}
function tryParseJsonStrict(raw: string): any {
  try { return JSON.parse(raw); } catch {}
  try { return JSON.parse(repairJson(raw)); } catch {}
  try { return JSON.parse(extractLargestJsonObject(raw)); } catch {}
  throw new Error("Modell lieferte kein valides JSON.");
}



async function jsonReformatWithOpenAI(
  bad: string,
  modelForFix: string,
  jsonSchema?: any
): Promise<any> {
  const client = getOpenAI();
  if (!client) throw new Error("OPENAI_API_KEY fehlt (JSON-Reformat).");
  const response_format = { type: "json_object" } as any;

	const res = await withTimeout(
	  client.chat.completions.create({
		model: modelForFix,
		messages: [
		  { role: "system", content: "You are a JSON sanitizer. Return ONLY a single valid JSON object. No markdown, no prose." },
		  { role: "user", content: `Fix this into valid JSON object (keep semantics, arrays, strings):\n\n${bad}` }
		],
		response_format: { type: "json_object" },
		max_completion_tokens: 1800
	  }),
	  120000 // vorher 60000 â€“ robuster machen
	);

  const txt = res.choices?.[0]?.message?.content ?? "";
  return tryParseJsonStrict(txt);
}


// AI-Debug Logging
async function writeAiDebug(label: string, content: string) {
  try {
    const enabled = process.env.DEBUG_AI !== "0";
    if (!enabled) return;
    const siteId = getSiteIdStrictFromRequest(req);
    const projectRoot = process.cwd();
    const dir = path.join(projectRoot, "sites", siteId, "content", "_ai-debug");
    await fs.mkdir(dir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safe = String(label || "log").replace(/[^a-z0-9\-_.]/gi, "_");
    const file = path.join(dir, `${ts}__${safe}.txt`);
    await fs.writeFile(file, String(content ?? ""), "utf8");
  } catch {}
}


async function generateAiCopyFromKeyword(
  language: string,
  mainKeyword: string,
  products: KBProduct[],
  opts: { textModel: string; force?: boolean; fallbackModel?: string },
  promptContext: {
    brandName: string;
    topicDomain: string;
    brandDescription: string;
    voice: string;
    positioning: string;
  }
): Promise<AiCopy> {
  const client = getOpenAI();
  if (!client) throw new Error("OPENAI_API_KEY fehlt/ungültig â€“ AI-Texte kÃ¶nnen nicht erzeugt werden.");

  const lang = language ;
  const nonce = opts.force ? `#v=${Date.now()}` : `#n=${Math.round(Math.random() * 1e9)}`;
  const model1 = opts.textModel || process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
  const modelFix = opts.fallbackModel || process.env.OPENAI_TEXT_MODEL_FALLBACK || "gpt-4o-mini";


// bewusst KEINE Amazon-Titel (kommen aus DE-PAAPI)
const productNames = products.map((p) => p.name || p.asin).join(" | ");

const isFr = String(lang).trim().toLowerCase() === "fr";

const frNativeGuard = `
IMPORTANT – FRENCH NATIVE STYLE (hard):
- Write like a native French editor, NOT like a translation.
- Use shorter sentences and natural rhythm.
- Use direct address consistently (tutoiement).
- Start with the usage context BEFORE technical explanations.
- Prefer phrasing like: "dans la pratique", "au quotidien", "selon ton jardin".
- Avoid scholastic/encyclopedic wording and generic filler.
`.trim();

const frHeroIntroGuard = `
HERO INTRO (FR native, hard):
- Sentence 1 MUST start with real-life usage context (examples: "Dans la pratique,", "Au quotidien,", "Selon ton jardin,").
- Sentence 1 MUST address the reader with "tu" (tutoiement).
- Do NOT use meta phrases like: "Dans ce guide", "Dans cet article", "Nous allons", "Tu découvriras".
- Keep sentences short and natural (avoid long, German-style structures).
`.trim();

const heroIntroStyleGuard = isFr ? `\n${frHeroIntroGuard}\n` : "";

const systemBase =
  `You are an expert SEO copywriter for an affiliate website.

  BRAND CONTEXT:
  - Brand: ${promptContext.brandName}
  - Topic/Domain: ${promptContext.topicDomain}
  - Brand description: ${promptContext.brandDescription}
  - Voice: ${promptContext.voice}
  - Positioning: ${promptContext.positioning}

  LANGUAGE (hard):
  - ${outputLanguageInstruction(lang)}

  CONTENT REQUIREMENTS (hard):
  ${heroIntroStyleGuard}- Hero intro: 3-5 sentences, must mention the exact main keyword once. Never include any URLs or hyperlinks (e.g., https://..., www.) in Hero Intro.
  - Criteria: 5–8 distinct criteria; each with a short heading (NO numbering) + 3-5 sentences body.
  - Pros: ≥5 items; Cons: ≥3 items (concise bullet points).
  - FAQ: 5-10 Q&A; each answer must have exactly 3–5 sentences (<= 400 chars).
  - Product details: For each product, the "summary" MUST be 4–6 sentences (concise, benefits-focused).
  - Alternatives: 4–6 sentences explaining similar or alternative products that could also be interesting to the reader.
  - Conclusion: 5–7 sentences, summarizing key decisions; mention main keyword once.

  SEO:
  - Use the main keyword naturally (no stuffing).
  - Create an SEO-friendly title + meta description in the same language.

  COMPLIANCE:
  - No prices, no user reviews, no unverifiable claims, no medical/safety advice beyond obvious basics.

  OUTPUT FORMAT:
  Return ONLY a single valid JSON object (no markdown, no code fences).
  Keys:
  title, heroIntro, keyTakeaways, criteria[{heading,body}], pros, cons, faq[{q,a}], conclusion,
  seoTitle, metaDescription, table{headers[],rows[][]}, productDetails[{summary,bestFor,keyFeatures[]}], alternatives
  `;


	const system =
		String(lang).trim().toLowerCase() === "fr"
			? `${frNativeGuard}\n\n${systemBase}`
			: systemBase;


	const user = {
	  task: "Generate buying-guide copy (SEO, strict JSON)",
	  language: lang,
	  languageInstruction: outputLanguageInstruction(lang),
	  promptContext,
	  mainKeyword,
		productsContext: products.map(p => ({
		  asin: p.asin,
		  // KEINE Amazon-Titel im Prompt
		  title: p.name || "",
		  img: Boolean((p as any).imgAmazon),
		  url: (p as any).buyUrl || ""
		})),

	  variationHint: `Use mainKeyword="${mainKeyword}" (exact string) and consider products: ${productNames}. ${nonce}`,
	  formattingRules: {
		heroIntro: { minSentences: 3, maxSentences: 5 },
		criteria: { min: 5, max: 8, bodySentences: { min: 3, max: 5 } },
		pros: { min: 5 }, cons: { min: 3 },
		faq: { min: 5, max: 10, answerSentences: 3, maxAnswerChars: 400 },
		productDetails: { summarySentences: { min: 4, max: 6 } },
		conclusion: { minSentences: 5, maxSentences: 7 }
	  }
	};


  // exakt wie vorher: reines JSON-Objekt format
  const response_format = { type: "json_object" } as any;

  // ===== Versuch #1 =====
  let raw1 = "";
  try {
    const resp1 = await withTimeout(
	  client.chat.completions.create({
		model: model1,
		messages: [
		  { role: "system", content: system + "\n\nReturn ONLY JSON. No markdown. No code fences. No commentary." },
		  { role: "user", content: JSON.stringify(user) }
		],
		// mehr Output erlauben:
		max_completion_tokens: 2400,
		response_format: { type: "json_object" }
	  }),
	  120000 // vorher 90000 â€“ hier explizit 120s
	);

    raw1 = resp1.choices?.[0]?.message?.content ?? "";
    await writeAiDebug("copy-try1", raw1);

    const parsed1 = tryParseJsonStrict(raw1);
    const copy1 = normalizeAiCopy(mainKeyword, products, parsed1);
    if (typeof (globalThis as any).enforceContentMinimums === "function") {
      (globalThis as any).enforceContentMinimums(copy1);
    }
    return copy1;
  } catch (e1: any) {
    await writeAiDebug("copy-try1-error", String(e1?.message ?? e1));
  }

  // ===== Versuch #2: lokale Reparatur =====
  try {
    const parsed2 = tryParseJsonStrict(raw1);
    const copy2 = normalizeAiCopy(mainKeyword, products, parsed2);
    if (typeof (globalThis as any).enforceContentMinimums === "function") {
      (globalThis as any).enforceContentMinimums(copy2);
    }
    return copy2;
  } catch (e2: any) {
    await writeAiDebug("copy-try2-localrepair-error", String(e2?.message ?? e2));
  }

  // ===== Versuch #3: Reformat mit Fallback-Modell =====
  try {
    const fixed = await jsonReformatWithOpenAI(raw1, modelFix);
    await writeAiDebug("copy-reformat", JSON.stringify(fixed));
    const copy3 = normalizeAiCopy(mainKeyword, products, fixed);
    if (typeof (globalThis as any).enforceContentMinimums === "function") {
      (globalThis as any).enforceContentMinimums(copy3);
    }
    return copy3;
  } catch (e3: any) {
    await writeAiDebug("copy-reformat-error", String(e3?.message ?? e3));
  }

  throw new Error("AI copy generation failed: no valid JSON after 3 attempts");
}



// required-field helper
function ensureField<T>(val: T | undefined, field: string): T {
  if (
    val === undefined ||
    val === null ||
    (typeof val === "string" && val.trim().length === 0) ||
    (Array.isArray(val) && val.length === 0)
  ) {
    throw new Error(`AI did not provide required field: ${field}`);
  }
  return val;
}

function normalizeSentencesToRange(
  text: string,
  min = 4,
  max = 6,
  features?: string[]
): string {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";

  // naive Satztrennung an . ! ?
  let sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);

  // wenn zu kurz: aus keyFeatures weitere Sätze bauen
  if (sentences.length < min) {
    const extras = (features || [])
      .map(f => String(f || "").trim())
      .filter(Boolean)
      .map(f => {
        // kurze, sachliche Zusatzsätze aus Features formen
        const base = f.replace(/[.;:\s]+$/g, "");
        return base ? `${base}.` : "";
      })
      .filter(Boolean);

    for (const ex of extras) {
      if (sentences.length >= min) break;
      sentences.push(ex);
    }
  }

  // wenn zu lang: auf max begrenzen
  if (sentences.length > max) {
    sentences = sentences.slice(0, max);
  }

  return sentences.join(" ");
}



/** Repariert Mojibake (z. B. "ÃƒÂ¼") nur wenn verdächtige Muster oder ï¿½ vorkommen. */
function fixMojibake(s: string): string {
  if (!s) return s as any;
  if (/[ÃƒÃ‚Ã¢]|ï¿½/.test(s)) {
    try {
      const candidate = Buffer.from(s, "latin1").toString("utf8");
      // Ãœbernehme nur, wenn es _besser_ ist (weniger ï¿½, weniger Ãƒ etc.)
      const bad = (t: string) => (t.match(/[ÃƒÃ‚Ã¢]|ï¿½/g) || []).length;
      if (bad(candidate) < bad(s)) return candidate;
    } catch {}
  }
  return s;
}



/** HTML-Entities â†’ echte Zeichen (benannte + numerische, dezimal & hex) */
function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  let s = String(str);

  // numerische (hex) zuerst
  s = s.replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
    try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return _m; }
  });

  // numerische (dezimal)
  s = s.replace(/&#(\d+);/g, (_m, dec) => {
    try { return String.fromCodePoint(parseInt(dec, 10)); } catch { return _m; }
  });

  // benannte
  s = s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    // &amp; ganz zum Schluss:
    .replace(/&amp;/g, "&");

  return s;
}



function normalizeAiCopy(mainKeyword: string, products: KBProduct[], parsed: any): AiCopy {
  // ---- Sanitizer (wie gehabt) ----
  const norm = (x: string) => {
    let v = String(x ?? "");
    v = decodeHtmlEntities(v);
    v = fixMojibake(v);
    return v.replace(/\s+/g, " ").trim();
  };

  // Alles zu Array "biegen"
  const toArray = (v: any): any[] =>
    Array.isArray(v) ? v : (v == null ? [] : (typeof v === "string" ? [v] : [v]));

  // ---- Pflichtfelder (Strings) ----
  const title      = norm(ensureField<string>(parsed?.title, "title"));
  const heroIntro  = norm(ensureField<string>(parsed?.heroIntro, "heroIntro"));
  const conclusion = norm(ensureField<string>(parsed?.conclusion, "conclusion"));
  const alternatives = norm(String(parsed?.alternatives ?? ""));
  const seoTitle   = norm(ensureField<string>(parsed?.seoTitle, "seoTitle"));
  const metaDesc   = norm(ensureField<string>(parsed?.metaDescription, "metaDescription"));

  // ---- Arrays defensiv koerzieren ----
  const keyTakeawaysRaw = ensureField<any[]>(toArray(parsed?.keyTakeaways), "keyTakeaways");
  const prosRaw         = ensureField<any[]>(toArray(parsed?.pros), "pros");
  const consRaw         = ensureField<any[]>(toArray(parsed?.cons), "cons");

  // criteria: wenn string â†’ zu {heading:<string>, body:"â€”"} machen
  const criteriaInput = Array.isArray(parsed?.criteria) ? parsed?.criteria : toArray(parsed?.criteria);
  const criteriaRaw   = ensureField<any[]>(criteriaInput, "criteria").map((c: any) =>
    (c && typeof c === "object")
      ? c
      : { heading: String(c ?? "Kriterium"), body: "â€”" }
  );

  // faq: wenn string â†’ zu {q:<string>, a:"â€”"} machen
  const faqInput = Array.isArray(parsed?.faq) ? parsed?.faq : toArray(parsed?.faq);
  const faqRaw   = ensureField<any[]>(faqInput, "faq").map((f: any) =>
    (f && typeof f === "object")
      ? f
      : { q: String(f ?? "Frage"), a: "â€”" }
  );

  // productDetails: defensiv zu Array + Felder sichern, Rest in normalize unten
  const productDetRaw = ensureField<any[]>(toArray(parsed?.productDetails).slice(0, 4), "productDetails");

  // ---- Tabelle: bei Unsinn Auto-Table aus Heuristik nehmen ----
  let tableHeadersRaw = toArray(parsed?.table?.headers);
  let tableRowsRaw    = Array.isArray(parsed?.table?.rows) ? parsed?.table?.rows : [];

	if (tableHeadersRaw.length === 0 || tableRowsRaw.length === 0) {
	  const kind = classifyArticleKind(mainKeyword, products);
		const auto = chooseTableColumnsAndRows(mainKeyword, products, { raw: true });
		tableHeadersRaw = auto.headers; // KEYS
		tableRowsRaw    = auto.rows;

	}


  // ---- Normierte Arrays ----
  const keyTakeaways = keyTakeawaysRaw.map((v: any) => norm(String(v)));
  const pros         = prosRaw.map((v: any) => norm(String(v)));
  const cons         = consRaw.map((v: any) => norm(String(v)));

  const criteria = criteriaRaw.map((c: any, i: number) => {
    const heading = norm(String(c?.heading ?? `Kriterium ${i + 1}`)).replace(/^Kriterium\s*\d+:\s*/i, "");
    const body    = norm(String(c?.body ?? "â€”"));
    return { heading, body };
  });

  const faq = faqRaw.map((f: any, i: number) => {
    const q = norm(String(f?.q ?? `Frage ${i + 1}`));
    const a = norm(String(f?.a ?? "â€”"));
    return { q, a };
  });

  const productDetails = productDetRaw.map((d: any, i: number) => {
    const bestFor        = norm(String((d?.bestFor ?? "Typische Gartenaufgaben")));
    const keyFeaturesArr = toArray(d?.keyFeatures).map((v:any)=>norm(String(v)));
    let summary          = norm(String(d?.summary ?? "Kurzer Ãœberblick: Stärken im Garten-Alltag."));
    summary              = normalizeSentencesToRange(summary, 4, 6, keyFeaturesArr);
    return { summary, bestFor, keyFeatures: keyFeaturesArr.length ? keyFeaturesArr : ["Solide Grundleistung", "Alltagstauglich", "Einfache Bedienung"] };
  });

  // Fehlende productDetails bis 4 auffüllen (falls Modell <4 geliefert hat)
  while (productDetails.length < 4) {
    productDetails.push({
      summary: "Kurzer Ãœberblick: Stärken im Garten-Alltag.",
      bestFor: "Typische Gartenaufgaben",
      keyFeatures: ["Solide Grundleistung", "Alltagstauglich", "Einfache Bedienung"]
    });
  }

  // Tabelle final normalisieren
  const table = {
    headers: tableHeadersRaw.map((h: any) => norm(String(h))),
    rows: tableRowsRaw.map((r: any, i: number) => {
      const rowArr = Array.isArray(r) ? r : toArray(r);
      return rowArr.map((cell: any) => norm(String(cell ?? "â€”")));
    })
  };

  return {
    title,
    heroIntro,
    keyTakeaways,
    criteria,
    pros,
    cons,
    faq,
    conclusion,
    seoTitle,
    metaDescription: metaDesc,
    table,
    productDetails,
	alternatives
  };
}



/* ======================================================================== */
/* =                       MARKDOWN RENDERER (KAUFBERATUNG)                = */
/* ======================================================================== */

	type InlineAnchor = { anchorText: string; url: string };

	// baut einen "lockeren" Regex, der ae/Ã¤, oe/Ã¶, ue/Ã¼, ÃŸ/ss und Leerzeichen/Hyphen abdeckt
	function createLooseRegex(term: string): RegExp {
	  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	  const raw = String(term || "").trim();
	  if (!raw) return /$a/; // nie-matchendes Fallback

	  // tokens: durch Leerzeichen/Hyphen getrennt
	  const rawTokens = raw.split(/[\s\-]+/).filter(Boolean);

	  // pro Token Zeichen für Zeichen in Regex-Alternativen umwandeln
	  function tokenToPattern(tok: string): string {
		let out = "";
		for (let i = 0; i < tok.length; ) {
		  const two = tok.slice(i, i + 2).toLowerCase();
		  const ch  = tok[i];

		  if (two === "ae") { out += "(?:Ã¤|ae)"; i += 2; continue; }
		  if (two === "oe") { out += "(?:Ã¶|oe)"; i += 2; continue; }
		  if (two === "ue") { out += "(?:Ã¼|ue)"; i += 2; continue; }

		  const lower = ch.toLowerCase();
		  if (lower === "Ã¤") { out += "(?:Ã¤|ae)"; i += 1; continue; }
		  if (lower === "Ã¶") { out += "(?:Ã¶|oe)"; i += 1; continue; }
		  if (lower === "Ã¼") { out += "(?:Ã¼|ue)"; i += 1; continue; }
		  if (ch === "ÃŸ")    { out += "(?:ÃŸ|ss)"; i += 1; continue; }

		  out += esc(ch);
		  i += 1;
		}
		return out;
	  }

	  const tokens = rawTokens.map(tokenToPattern);
	  const body   = tokens.join("[\\s\\-]+"); // zwischen Tokens: Space/Hyphen tolerant

	  const final = `(^|[^\\wÃ„Ã–ÃœÃ¤Ã¶Ã¼ÃŸ])(${body})(?=[^\\wÃ„Ã–ÃœÃ¤Ã¶Ã¼ÃŸ]|$)`;
	  return new RegExp(final, "iu");
	}



	function pickInlineAnchors(
	  ai: AiCopy,
	  currentSlug: string,
	  currentCategory: string,
	  registry: ContentRegistry,
	  maxLinks = 4
	): { anchorText: string; url: string }[] {
	  const corpusOrig = [
		ai.heroIntro,
		...(ai.criteria || []).map(c => `${c.heading}. ${c.body}`),
		...(ai.productDetails || []).map(p => p.summary || ""),
		...(ai.faq || []).map(x => `${x.q}. ${x.a}`),
		ai.conclusion
	  ].join(" \n ");

	  const hasCareTopic = /\b(Ã¶l|oel|holzÃ¶l|pflege|imprägnierung|schutz|versiegelung)\b/i.test(corpusOrig);

	  const candidates = (registry.items || [])
		.filter(i => i.category === currentCategory && i.slug !== currentSlug);

	  type Scored = { entry: RegistryEntry; rawTerm: string; score: number };
	  const bucketByAnchor: Record<string, Scored[]> = {};

	  // sammeln & scoren
	  for (const e of candidates) {
		const rawTerms = [e.mainKeyword, ...(e.synonyms || [])]
		  .map(s => String(s || "").trim())
		  .filter(Boolean);

		for (const raw of rawTerms) {
		  const re = createLooseRegex(raw);
		  if (!re.test(corpusOrig)) continue;

		  let sc = 1;
			const kw = safeStr(e.mainKeyword);         // <-- einmal absichern
			if (normDe(raw) === normDe(kw)) sc += 1;
			if (e.isPillar) sc += 2;


		  // Themen-Boost: Öl/Pflege-Kontext

			if (hasCareTopic && /\b(öl|oel|pflege|imprägnierung|holzöl)\b/i.test(kw)) sc += 1;

			const key = normDe(raw);
			(bucketByAnchor[key] ||= []).push({ entry: e, rawTerm: raw, score: sc });

		}
	  }

	  // â€žzufälligeâ€œ (stabile) Auswahl je Anchor-Text
	  const pickFrom = (arr: Scored[], seedStr: string): Scored => {
		// erst nach Score/updatedAt vorsortieren
		arr.sort((a, b) =>
		  b.score - a.score ||
		  (b.entry.updatedAt || "").localeCompare(a.entry.updatedAt || "")
		);
		// dann stabil â€žzufälligâ€œ: Hash -> Index
		let h = 2166136261;
		const s = seedStr;
		for (let i = 0; i < s.length; i++) {
		  h ^= s.charCodeAt(i);
		  h = (h * 16777619) >>> 0;
		}
		const idx = arr.length ? h % arr.length : 0;
		return arr[idx];
	  };

	  const chosen: Scored[] = [];
	  for (const key of Object.keys(bucketByAnchor)) {
		const picked = pickFrom(bucketByAnchor[key], `${currentSlug}|${key}`);
		chosen.push(picked);
	  }

	  // jetzt noch auf maxLinks begrenzen (nach Score/Recency)
	  chosen.sort((a, b) =>
		b.score - a.score ||
		(b.entry.updatedAt || "").localeCompare(a.entry.updatedAt || "")
	  );

	  const out: { anchorText: string; url: string }[] = [];
	  const seenUrls = new Set<string>();
	  for (const s of chosen) {
		if (out.length >= maxLinks) break;
		if (seenUrls.has(s.entry.url)) continue;
		out.push({ anchorText: s.rawTerm, url: s.entry.url });
		seenUrls.add(s.entry.url);
	  }
	  return out;
	}


// 🔧 renderKaufberatungMarkdown (minimal-fix, damit es wieder sauber rendert)
// Problem:
//   Du nutzt UI_STRINGS direkt (kann undefined sein) + teils noch language-ternaries.
//   Außerdem sind in deinem Snippet ein paar "Ã…" Encoding-Artefakte drin, die im UI sichtbar werden.
// Lösung:
//   1) UI über getUiStrings(language) holen (STRICT throw) statt UI_STRINGS[language]
//   2) Nur die Stellen ersetzen, die du bereits halb umgebaut hast (CTA + Labels + 3 Überschriften + Best-for)
//   3) Rest unverändert lassen, damit Layout wieder stimmt.
//
// ✅ Copy/Paste: Ersetze deine Funktion KOMPLETT durch diesen Block.
// Voraussetzung: getUiStrings(language) existiert global (wie zuvor gepostet).

function renderKaufberatungMarkdown(
  keyword: string,
  prods: KBProduct[],
  ai: AiCopy,
  tableFromPA: { headers: string[]; rows: string[][] },
  language: string,
  inlineAnchors: { anchorText: string; url: string }[] = []
) {
  // Lokaler Helper: Paragraph-Linker, der jeden AnchorText & jede URL im ganzen Artikel max. 1x verlinkt
  // [InlineLinks Helper START]
  function createParagraphLinker(anchors: { anchorText: string; url: string }[]) {
    const usedUrls = new Set<string>(); // jede URL max. 1x im Artikel
    const usedText = new Set<string>(); // jeder AnchorText (normalisiert) max. 1x im Artikel

    // längere Phrasen zuerst (vermeidet Teil-Treffer)
    const list = [...anchors]
      .filter(a => a?.anchorText && a?.url)
      .sort((a, b) => normDe(b.anchorText).length - normDe(a.anchorText).length);

    return function linkifyOneParagraph(txt: string): string {
      const s = String(txt ?? "");
      if (!s || !list.length) return s;

      // HTML in Tokens aufteilen (Tags vs. Text)
      const parts = s.split(/(<[^>]+>)/g);

      // Flags: innerhalb welcher Bereiche darf NICHT ersetzt werden?
      let insideA = false, insideCode = false, insideHeading = false;

      for (let i = 0; i < parts.length; i++) {
        const tok = parts[i];

        if (tok.startsWith("<")) {
          if (/^<a\b/i.test(tok)) insideA = true;
          else if (/^<\/a>/i.test(tok)) insideA = false;

          if (/^<code\b|^<pre\b/i.test(tok)) insideCode = true;
          else if (/^<\/code>|^<\/pre>/i.test(tok)) insideCode = false;

          if (/^<h[1-6]\b/i.test(tok)) insideHeading = true;
          else if (/^<\/h[1-6]>/i.test(tok)) insideHeading = false;

          continue; // Tags unangetastet lassen
        }

        if (insideA || insideCode || insideHeading) continue;

        let segment = tok;
        for (const a of list) {
          const kText = normDe(a.anchorText);
          if (usedUrls.has(a.url) || usedText.has(kText)) continue;
          const re = createLooseRegex(a.anchorText);
          segment = segment.replace(re, (_m, pre, hit) => {
            const rawUrl = String(a.url || "");
            if (!/^https?:\/\/|^\//i.test(rawUrl)) return pre + escapeHtml(hit);
            const safeUrl = rawUrl.replace(/"/g, "&quot;");
            usedUrls.add(rawUrl);
            usedText.add(kText);
            return `${pre}<a href="${safeUrl}" rel="nofollow noopener">${escapeHtml(hit)}</a>`;
          });
        }
        parts[i] = segment;
      }

      return parts.join("");
    };
  }

  // Erzeuge den Linker EINMAL für den gesamten Artikel:
  const L = createParagraphLinker(inlineAnchors);
  // [InlineLinks Helper END]

  const [p1, p2, p3, p4] = prods;

  // ✅ MIN-FIX: UI immer über Helper holen (STRICT throw), nicht direkt UI_STRINGS[language]
  const UI = getUiStrings(language);
const LOCALE = getLocaleStrings(language);
	const ARTICLE_DISCLAIMER_MDX = LOCALE.disclaimerBlockMdx;
	const ARTICLE_FOOTNOTE_MDX = LOCALE.disclaimerFootnoteMdx;
  const LINK_LABEL = UI.linkLabel;
  const IMAGE_LABEL = UI.imageLabel;

	const localizeHeader = (h: string) => {
	  if (h === "Modell") return h;
	  const k = h.toLowerCase();
	  return (
		TABLE_SCHEMA.labels.i18n?.[language]?.[k] ||
		TABLE_SCHEMA.labels.de[k] ||
		h
	  );
	};


  // ---- JSON-LD ----
  const faqJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (ai.faq || []).map((f: any) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a }
    }))
  }, null, 0);

  const itemListJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: prods.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: p.buyUrl,
      name: p.title
    }))
  }, null, 0);

  // ---- Kaufkriterien ohne führende Tabs/Spaces ----
  const criteriaBlocks = (ai.criteria || [])
    .map((c: any) => `### ${escapeHtml(c.heading)}\n${L(c.body)}`)
    .join("\n\n");

   // ---- TABELLE (HTML): 1) Modell, 2) Bild, 3..n) andere Spalten, letzte: Link ----
  const otherKeys = (tableFromPA.headers || []).slice(1); // Keys
  const headers = [
    // tableFromPA.headers[0] ist "Modell" als KEY
    tTableHeader((tableFromPA.headers?.[0] ?? "Modell"), language),
    IMAGE_LABEL,
    ...otherKeys.map(h => tTableHeader(h, language)),
    LINK_LABEL
  ];

  const escCell = (v: string) => escapeHtml(String(v)).replace(/\|/g, "&#124;");

  // A11y: th scope + caption
  const headerHtml = `<tr>${headers
	.map(h => `<th scope="col">${escCell(normalizeHeader(h, language))}</th>`)
    .join("")}</tr>`;

  // Guard: nur rendern, wenn Tabelle sinnvolles Minimum hat
  const shouldRenderTable =
    (tableFromPA.headers?.length ?? 0) >= 2 &&
    (tableFromPA.rows?.length ?? 0) >= 3;

  const bodyHtml = prods.map((prod, idx) => {
    const base = tableFromPA.rows?.[idx] || [];

    const modelCell = escCell(base[0] ?? prod.title ?? prod.asin);

    const imgTd = prod.imgAmazon


// ...
? `<td><img src="${prod.imgAmazon}" alt="${escCell(prod.title ?? prod.name ?? prod.asin)} – ${LOCALE.thumbnailAltSuffix}" width="72" height="72" loading="lazy" /></td>`
      : `<td>—</td>`;

    // FIX: stabile Zuordnung: exakt so viele Zellen wie otherKeys
    const otherTds = otherKeys.map((_, j) => {
      const v = base[j + 1] ?? "";
      const out = String(v).trim() ? escCell(String(v)) : "—";
      return `<td>${out}</td>`;
    }).join("");

    // CTA aus UI (kein Preis)
// CTA aus UI (kein Preis)
const ctaLabel = UI.ctaAmazon;

const ctaTd = `<td><a
  href="${prod.buyUrl}"
  class="btn-amazon"
  rel="nofollow sponsored noopener"
  target="_blank"
>
  ${ctaLabel}
</a></td>`;


    return `<tr><td>${modelCell}</td>${imgTd}${otherTds}${ctaTd}</tr>`;
  }).join("");

  // ✅ caption + optionaler Guard
  const tableHtml = shouldRenderTable ? `
<h2>${UI.tableHeading}</h2>
<div class="table-wrap">
  <table class="comparison-table">
    <caption class="sr-only">${escCell(UI.tableHeading)}</caption>
    <thead>${headerHtml}</thead>
    <tbody>${bodyHtml}</tbody>
  </table>
</div>`.trim() : "";


  // ---- Produktdetails ----
  const pd = ai.productDetails || [];
  const prodDetailLeft = (i: number, p: KBProduct) => {
    const d = pd[i] || { summary: "", bestFor: "", keyFeatures: [] as string[] };
    const features = (d.keyFeatures || []).map(f => `<li>${escapeHtml(f)}</li>`).join("");

    // ✅ MIN-FIX: Best-for label aus UI
    const bestFor = d.bestFor
      ? `<p class="best-for"><strong>${UI.bestForLabel}:</strong> ${escapeHtml(d.bestFor)}</p>`
      : "";

    return `
<p>${L(d.summary)}</p>
${bestFor}
${features ? `<ul class="feature-list">${features}</ul>` : ""}
<div style="height:16px"></div>
<p style="margin-top:8px;">
<a
  href="${p.buyUrl}"
  class="buy-button"
  rel="nofollow sponsored noopener"
  target="_blank"
  data-pirsch-event="Affiliate Click"
  data-pirsch-meta-asin="${p.asin}"
  data-pirsch-meta-name="${escapeHtml(p.name || p.title || p.asin)}"
  data-pirsch-meta-pos="detail"
>
  ${UI.ctaAmazon}
</a>
</p>
`.trim();
  };

  const prodTwoCol = (p: KBProduct, i: number) => `
<div class="prod-two-col">
  <div class="prod-left">
    ${prodDetailLeft(i, p)}
  </div>
  <div class="prod-right">
    <img class="product-image" src="${p.imgAmazon}" alt="${escapeHtml(p.title)} – Produktbild (Amazon)" ${p.imgAmazonWidth && p.imgAmazonHeight ? `width="${p.imgAmazonWidth}" height="${p.imgAmazonHeight}"` : `width="400" height="400"`} loading="lazy" />
  </div>
</div>
`.trim();

  // ✅ MIN-FIX: Products-in-detail heading aus UI
  const productsDetailSection = `
## ${UI.productsInDetailHeading}
### ${escapeHtml(buildBrandModel(p1.paRaw, p1.title, p1.name, keyword))}
${prodTwoCol(p1,0)}
<hr class="soft-sep" />

### ${escapeHtml(buildBrandModel(p2.paRaw, p2.title, p2.name, keyword))}
${prodTwoCol(p2,1)}
<hr class="soft-sep" />

#### ${escapeHtml(buildBrandModel(p3.paRaw, p3.title, p3.name, keyword))}
${prodTwoCol(p3,2)}
<hr class="soft-sep" />

### ${escapeHtml(buildBrandModel(p4.paRaw, p4.title, p4.name, keyword))}
${prodTwoCol(p4,3)}
`.trim();

	if (!ai.heroIntro || !ai.heroIntro.trim()) {
	  throw new Error(`AI-Fehler: heroIntro fehlt für keyword="${keyword}"`);
	}
	if (!ai.conclusion || !ai.conclusion.trim()) {
	  throw new Error(`AI-Fehler: conclusion fehlt für keyword="${keyword}"`);
	}

	const heroIntro = stripLinks(ai.heroIntro);
	const conclusionLinked = L(ai.conclusion);


  /// Hero-Intro sicher ohne Links rendern
  const heroIntroSafe = stripLinks(heroIntro);
  console.log("[heroIntro-preview]", String(heroIntroSafe).slice(0, 200));




  // ---- Finale Rückgabe (MDX) ----
  return `
<div class="hero-split">
  <div class="hero-left">
    <img
      src="${p1.imgAi}"
	alt="${escapeHtml(p1.name || ai.title || keyword)} – ${LOCALE.heroAltSuffix}"
      class="hero-img"
      width="1024"
      height="1024"
      loading="eager"
      fetchpriority="high"
      decoding="async"
      sizes="(max-width: 960px) 100vw, 60vw"
    />
  </div>
  <div class="hero-right">
    <h1 class="page-title">${escapeHtml(ai.title || `${keyword}`)}</h1>
    <p>${escapeHtml(stripLinks(heroIntroSafe))}</p>
    ${
      (ai.keyTakeaways && ai.keyTakeaways.length)
        ? `<div class="key-takeaways"><ul>${ai.keyTakeaways.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul></div>`
        : ""
    }
  </div>
</div>


${tableHtml}
<div class="table-footnote-marker" aria-hidden="true">
  <sup>¹</sup>
</div>

---
## ${UI.buyingCriteriaHeading}
${criteriaBlocks}

---

## ${UI.prosConsHeading}

<div class="proscons">
  <div class="pros-card">
    <h3>${UI.prosLabel}</h3>
    <ul>
      ${(ai.pros || []).map((p: string) => `<li>${escapeHtml(p)}</li>`).join("")}
    </ul>
  </div>
  <div class="cons-card">
    <h3>${UI.consLabel}</h3>
    <ul>
      ${(ai.cons || []).map((c: string) => `<li>${escapeHtml(c)}</li>`).join("")}
    </ul>
  </div>
</div>

---

${productsDetailSection}

---

## ${UI.faqHeading}
${(ai.faq || []).map((f: any) => `
<details class="faq">
  <summary>${escapeHtml(f.q)}</summary>
  <div>${L(f.a)}</div>
</details>
`.trim()).join("\n")}

---

## ${UI.conclusionHeading}
${conclusionLinked}

${ARTICLE_FOOTNOTE_MDX}

<script type="application/ld+json">
${faqJsonLd}
</script>
<script type="application/ld+json">
${itemListJsonLd}
</script>
`.trim();
}







/* ======================================================================== */
/* =                            IMAGE GENERATION                           = */
/* ======================================================================== */

export async function POST(req: Request) {
  let articleExistedBefore = false;
  const t0 = Date.now();
  let siteId = "unknown";
  let language = ""; // STRICT: kein Default
  let slug = "unknown";
  const url = new URL(req.url);

  try {
	const projectRoot = findProjectRoot();

	// ✅ Body genau einmal früh lesen
	const body = await req.json().catch(() => ({}));

	// ✅ Für localhost: SiteId aus Body erlauben (weil Header bei dir nicht zuverlässig wechselt)
	const bodySiteId = (body?.siteId ?? "").toString().trim();
	siteId = bodySiteId || getSiteIdStrictFromRequest(req);

	console.log(
	  "[/api/generate] siteId resolved =",
	  siteId,
	  "header x-site-id =",
	  req.headers.get("x-site-id"),
	  "body.siteId =",
	  bodySiteId
	);

	const siteCfg = readSiteConfig(projectRoot, siteId);

    // 3.3.1 — PromptContext aus Super-Config
    const promptsCfg = (siteCfg as any).prompts || {};
    const promptContext = {
      brandName: promptsCfg.brandName ?? siteId,
      brandDescription: promptsCfg.brandDescription ?? "",
      topicDomain: promptsCfg.topicDomain ?? "",
      voice: promptsCfg.voice ?? "",
      positioning: promptsCfg.positioning ?? ""
    };

    // 🆕 STRICT: Sprache NUR aus config.defaultLanguage ableiten (Single Source of Truth)
    {
      const effectiveLanguage = siteCfg.defaultLanguage?.trim().toLowerCase();
      if (!effectiveLanguage) {
        throw new Error(
          `Konfigurationsfehler: defaultLanguage fehlt in config.json (siteId="${siteId}")`
        );
      }

      // Zulässige Werte erzwingen (Option A: alle Sprachen)
      const ALLOWED_LANGUAGES = new Set([
        "de", "en", "fr", "es", "it", "pt", "nl", "pl", "sv", "da", "no", "fi",
        "cs", "hu", "tr", "ja", "hi", "ar", "he", "ko", "zh", "ru"
      ]);

      if (!ALLOWED_LANGUAGES.has(effectiveLanguage)) {
        throw new Error(
          `Konfigurationsfehler: Sprache "${effectiveLanguage}" wird nicht unterstützt.`
        );
      }

      // ✅ EINZIGE Stelle, an der language gesetzt wird
      language = effectiveLanguage;

      // ✅ Früh validieren: UI + Output-Language müssen existieren (STRICT)
      getUiStrings(language);
      outputLanguageInstruction(language);
    }

    // 3.3.2 — Output-Language-Instruktion
    // ❗ MUSS nach der Language-Zuweisung kommen
    const langInstr = outputLanguageInstruction(language);
	const LOCALE = getLocaleStrings(language);
	const ARTICLE_DISCLAIMER_MDX = LOCALE.disclaimerBlockMdx;
	const ARTICLE_FOOTNOTE_MDX = LOCALE.disclaimerFootnoteMdx;
    // ↓↓↓ ab hier normaler Codefluss ↓↓↓

    // ↓↓↓ ab hier normaler Codefluss ↓↓↓

    // 🆕 ENDE NEUER BLOCK

    if (url.searchParams.get("debug") === "1") {
      return NextResponse.json({ ok: true, projectRoot, siteId, env: envSummary(siteCfg) });
    }
    if (url.searchParams.get("ping") === "1") {
      const client = getOpenAI();
      if (!client) return NextResponse.json({ ok: false, reason: "no_openai_key" }, { status: 400 });
      try {
        const r = await withTimeout(
          client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "ping" }],
            max_completion_tokens: 5
          }),
          15000
        );
        return NextResponse.json({ ok: true, model: (r as any).model });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 500 });
      }
    }


    // ------------------------------------------------------------
    // ------------------------------------------------------------
    // 1) Body PARSEN + language/mainKeyword früh setzen (mit Sanitizing)
    // ------------------------------------------------------------


    if (process.env.DEBUG_GENERATE === "1") {
      console.log("[/api/generate] RAW BODY:", body);
    }

    // Keyword defensiv säubern
    const rawIn = body?.mainKeyword;
    const keyword = fixMojibake(
      decodeHtmlEntities(typeof rawIn === "string" ? rawIn : String(rawIn ?? ""))
    ).replace(/\s+/g, " ").trim();

    if (!keyword) {
      throw new Error("Kategorieauswahl fehlgeschlagen: 'mainKeyword' fehlt oder ist leer.");
    }

    // Modelle (unverändert)
    const textModel  = String(body?.textModel  ?? process.env.OPENAI_TEXT_MODEL  ?? "gpt-4o-mini");
    const imageModel = String("gpt-image-1-mini");
    const imageSizeBody = String(body?.imageSize ?? process.env.OPENAI_IMAGE_SIZE ?? "1024x1024");
    const ALLOWED_SIZES = new Set(["1024x1024","1024x1536","1536x1024","auto"]);
    const imageSize = (ALLOWED_SIZES.has(imageSizeBody) ? imageSizeBody : "1024x1024") as
      "1024x1024" | "1024x1536" | "1536x1024" | "auto";
    const aiMode = (body?.aiMode ?? "fast") as "on" | "fast" | "off";
    const aiStrict = body?.aiStrict !== undefined ? Boolean(body.aiStrict) : false;
    const force = body?.force !== undefined ? Boolean(body.force) : true;
    const imagePolicy = (body?.imagePolicy ?? "reuse") as "reuse" | "refresh" | "off";
    const pageType = normalizePageType(body?.pageType);
    // ------------------------------------------------------------
    // 2) Kategorien laden + Intro-Dateien sicherstellen + beste Kategorie wählen
    // ------------------------------------------------------------
	const categories = ((siteCfg as any).categories || []).map((c: any) => {
	  const slug = c.slug ? normalizeSlug(c.slug) : (c.title ? normalizeSlug(c.title) : "");
	  const title = (c.title && String(c.title).trim()) || (c.slug && String(c.slug).trim()) || "";
	  return { id: c.id, slug, title };
	});

	const siteConfig = siteCfg;

	console.log("[/api/generate] siteId resolved =", siteId, "header x-site-id =", req.headers.get("x-site-id"));

    await ensureCategoryIntroFiles(projectRoot, siteId, categories, language, promptContext, langInstr);

    const pickedCategory = await chooseCategoryWithAI(keyword, categories, language,langInstr);
    const category = pickedCategory.slug;

	// --- Slug früh bestimmen ---
	const baseSlug = slugify(keyword);
	const outDirForSlug = path.join(projectRoot, "sites", siteId, "content", category);
	ensureDir(outDirForSlug);

	// FIX: Kein Hochzählen mehr, wir überschreiben vorhandene Dateien bewusst
	const slug = baseSlug;


    // --- Content Registry upserten ---
    let registry = readRegistry(projectRoot, siteId);
    {
      const selfUrl = `/${category}/${slug}`;
      const idx = registry.items.findIndex(i => i.slug === slug);
      const entry: RegistryEntry = {
        slug,
        url: selfUrl,
        mainKeyword: keyword,
        synonyms: [],
        category,
        isPillar: false,
        updatedAt: new Date().toISOString(),
      };
      
	  if (idx >= 0) {
		// vorhandenen Eintrag updaten
		registry.items[idx] = entry;
	  } else if (!articleExistedBefore) {
		// NEU: Nur beim ersten Anlegen des Artikels einen neuen Registry-Eintrag erzeugen
		registry.items.push(entry);
	  }
      writeRegistry(projectRoot, siteId, registry);
    }
    await ensureRegistrySynonyms(projectRoot, siteId, language);
    registry = readRegistry(projectRoot, siteId);

    // ------------------------------------------------------------
    // 3) Produkte/ASINs vorbereiten
    // ------------------------------------------------------------
    const inputProducts = Array.isArray(body?.products) ? body.products : [];
    let asins: string[] = Array.isArray(body?.asins) ? body.asins : [];
    if (asins.length === 0 && inputProducts.length > 0) {
      asins = inputProducts.map((p: any) => (p?.asin || "").trim()).filter(Boolean);
    }

    const asinRegex = /^[A-Z0-9]{10}$/;
    const validAsins = asins.map(a => a.toUpperCase()).filter(a => asinRegex.test(a)).slice(0, 4);
    if (validAsins.length !== 4) {
      return NextResponse.json(
        { ok: false, error: `erwarte genau 4 gültige ASINs, erhalten: ${validAsins.length}` },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 4) PA-API holen
    // ------------------------------------------------------------
    let paMap: Record<string, any> = {};
    try {
      paMap = await paapiGetItems(validAsins);
      try {
        const dbg = path.join(projectRoot, "sites", siteId, "content", "_ai-debug");
        ensureDir(dbg);
        fs.writeFileSync(path.join(dbg, `pa-${Date.now()}.json`), JSON.stringify(paMap, null, 2), "utf8");
      } catch {}
    } catch (e) {
      console.error("PA-API error:", e);
      return NextResponse.json({ ok: false, error: "Amazon PA-API fehlgeschlagen" }, { status: 500 });
    }
    // ------------------------------------------------------------
    // 4.1) Amazon-Linkbau: immer Ziel-Marketplace aus siteCfg erzwingen
    //      (unabhängig davon, was die PA-API liefert)
    // ------------------------------------------------------------
    const amz = siteCfg?.affiliate?.amazon;
    if (!amz?.domain || !amz?.partnerTag) {
      throw new Error(`Konfigurationsfehler: affiliate.amazon.domain/partnerTag fehlen (siteId="${siteId}")`);
    }

    const TARGET_DOMAIN = String(amz.domain).trim().toLowerCase();        // z.B. "amazon.fr"
    const TARGET_TAG = String(amz.partnerTag).trim();                    // z.B. "dein-fr-tag-21"

    function isTargetMarketplaceUrl(u: any): boolean {
      if (!u || typeof u !== "string") return false;
      try {
        const host = new URL(u).hostname.toLowerCase();
        return host === TARGET_DOMAIN || host.endsWith("." + TARGET_DOMAIN);
      } catch {
        return false;
      }
    }

	// Minimalistisch (nur tag). Optional kannst du später linkCode/th/psc ergänzen.
	function buildTargetAmazonUrl(asin: string): string {
	  const a = String(asin || "").trim().toUpperCase();
	  return `https://www.${TARGET_DOMAIN}/dp/${encodeURIComponent(a)}?tag=${encodeURIComponent(TARGET_TAG)}`;
	}


// ✅ Outbound-Tracking: Link läuft über /out und wird dann zu Amazon redirected.
// Vercel Analytics sieht Pageviews auf /out/... inkl. Kontextparametern
function buildOutboundUrl(targetUrl: string, asin: string): string {
  const from = `/${String(category)}/${String(slug)}`;

  const u =
    `/out/${encodeURIComponent(String(category))}/${encodeURIComponent(String(slug))}` +
    `?u=${encodeURIComponent(String(targetUrl))}` +
    `&from=${encodeURIComponent(from)}` +
    `&asin=${encodeURIComponent(String(asin))}`;

  return u;
}




    const prods: KBProduct[] = validAsins.map((asin) => {
      const pa = paMap[asin];
      const titleRaw = firstNonEmpty(
        gp(pa, ["ItemInfo","Title","DisplayValue"]),
        gp(pa, ["title"]),
        asin
      );
      const title = truncate(titleRaw, 100);
      const neutralName =
        (inputProducts.find((p: any) => (p?.asin||"").toUpperCase() === asin)?.name || "Rasentrimmer").trim();
      const detailFromApi = gp(pa, ["DetailPageURL"]);

	const detail = (() => {
	  // wenn API-URL passt: tag IMMER auf TARGET_TAG setzen
	  if (isTargetMarketplaceUrl(detailFromApi)) {
		try {
		  const u = new URL(detailFromApi);
		  u.searchParams.set("tag", TARGET_TAG);
		  return u.toString();
		} catch {
		  // falls URL kaputt: fallback
		  return buildTargetAmazonUrl(asin);
		}
	  }
	  // wenn API-URL nicht passt: eigene URL bauen
	  return buildTargetAmazonUrl(asin);
	})();

      const img =
        gp(pa, ["Images","Primary","Large","URL"]) ||
        gp(pa, ["Images","Primary","Medium","URL"]) ||
        gp(pa, ["Images","Primary","Small","URL"]) || "";
      const dims = gp(pa, ["Images","Primary","Large"]) || gp(pa, ["Images","Primary","Medium"]) || undefined;

      return {
        asin,
        name: neutralName,
        title,
        buyUrl: buildOutboundUrl(detail, asin),
        imgAmazon: img,
        imgAmazonWidth: dims?.Width,
        imgAmazonHeight: dims?.Height,
        imgAi: "",
        paRaw: pa
      };
    });

    if (prods.length !== 4) {
      return NextResponse.json(
        { ok: false, error: `interner Zustand: erwarte 4 Produkte, habe ${prods.length}` },
        { status: 400 }
      );
    }

    // 5) AI-Bild (Hero) — stabiler Dateiname + Reuse-Policy
	// 🔧 AI-Bild (Hero) — stabiler Dateiname + Reuse-Policy
	const pHero = prods[0];

// Lokaler AI-Cache unter sites/<siteId>/content/_ai (wie bisher)
const aiDir = path.join(projectRoot, "sites", siteId, "content", "_ai");
ensureDir(aiDir);

// Neuer, deploy-relevanter Pfad unter apps/site/public/ai
const publicAiDir = path.join(projectRoot, "public", "ai");
//const publicAiDir = path.join(projectRoot, "apps", "site", "public", "ai");


ensureDir(publicAiDir);

const aiFileBase = `kb-${siteId}-${slug}`;

const aiOutPath = path.join(aiDir, `${aiFileBase}.png`);
const publicAiOutPath = path.join(publicAiDir, `${aiFileBase}.png`);

// URL bleibt wie bisher, zeigt auf /ai/<file>.png (wird aus public/ai bedient)
const aiPublicUrl = `/ai/${aiFileBase}.png`;
// DEBUG: Image-Pipeline Basis-Infos
console.log("[img] paths", { siteId, slug, aiDir, aiOutPath, aiPublicUrl });

if (imagePolicy === "off" || aiMode === "off") {
	  console.log("[img] SKIP (policy/mode off)", { imagePolicy, aiMode, aiStrict });
 
  if (aiStrict) throw new Error("aiStrict aktiv, aber imagePolicy/aiMode ist 'off'.");
  // FIX: kein externer Host (next/image blockt via.placeholder.com)
  pHero.imgAi = "/placeholders/hero-1024.png"; // lege Datei in /public/placeholders/hero-1024.png ab
} else if (fs.existsSync(aiOutPath)) {
  // FIX: Immer reuse, egal ob force=true
  try {
    const st = fs.statSync(aiOutPath);
    if (st.size > 4096) {
      // vorhandene Datei auch in public/ai spiegeln
      try {
        fs.copyFileSync(aiOutPath, publicAiOutPath);
      } catch {
        // wenn Kopie fehlschlägt, trotzdem das bestehende Bild nutzen
      }
      pHero.imgAi = aiPublicUrl;
    } else {
      // defekte Datei löschen → danach wird weiter unten neu generiert
      fs.rmSync(aiOutPath, { force: true });
    }
  } catch {
    // ignore
  }
}

if (!pHero.imgAi) {
  const subject = keyword;
  const { prompt: heroImagePrompt } = buildHeaderImageSpec(subject, language);
  const client = getOpenAI();
  if (!client) {
    if (aiStrict) throw new Error("OPENAI_API_KEY fehlt/ungültig (AI-Bild).");
    pHero.imgAi = "/placeholders/hero-1024.png";
  } else {
    let lastErr: any = null;
	for (let attempt = 1; attempt <= 3; attempt++) {
	  try {
		console.log("[img] attempt start", {
		  attempt,
		  imageModel,
		  imageSize,
		  aiOutPath,
		  publicAiOutPath,
		  promptPreview: String(heroImagePrompt || "").slice(0, 120)
		});

	await generateAiImageFile(client, {
	  prompt: heroImagePrompt,
	  model: imageModel,
	  size: imageSize,
	  quality: "low",
	  outPath: aiOutPath,
	});


		const existsAfterGen = fs.existsSync(aiOutPath);
		const stat = existsAfterGen ? fs.statSync(aiOutPath) : null;

		console.log("[img] after generate", {
		  existsAfterGen,
		  size: stat?.size ?? 0
		});

		if (!stat || stat.size < 4096) {
		  throw new Error(`image too small (${stat?.size ?? 0} bytes)`);
		}

		// NEU: nach erfolgreicher Generierung auch nach public/ai kopieren
		try {
		  fs.copyFileSync(aiOutPath, publicAiOutPath);
		  console.log("[img] copied to public", {
			publicAiOutPath,
			existsPublic: fs.existsSync(publicAiOutPath)
		  });
		} catch (copyErr: any) {
		  console.log("[img] copy FAILED", String(copyErr?.message || copyErr));
		  // Original existiert trotzdem
		}

		pHero.imgAi = aiPublicUrl;
		console.log("[img] SUCCESS, using imgAi", pHero.imgAi);
		break;

	  } catch (e: any) {
		lastErr = e;
		console.log("[img] attempt FAILED", {
		  attempt,
		  error: String(e?.message || e)
		});
		await sleep(1000);
	  }
	}

	if (!pHero.imgAi) {
	  const msg = `AI image generation failed: ${String(lastErr?.message || lastErr)}`;
	  console.log("[img] FINAL FAIL → placeholder", msg);

	  if (aiStrict) throw new Error(msg);

	  pHero.imgAi = "/placeholders/hero-1024.png";
	}

  }
}

    // 6) Vergleichstabelle
    const comparisonTable = buildComparisonTable(prods);

	const aiCopy = await generateAiCopyFromKeyword(
	  language,
	  keyword,
	  prods,
	  { textModel, force },
	  promptContext,
	  (siteCfg as any).style
	);



    // 6a) Titelvorschläge generieren & besten wählen
    const norm = (x: string) => {
      let v = String(x ?? "");
      v = decodeHtmlEntities(v);
      v = fixMojibake(v);
      return v.replace(/\s+/g, " ").trim();
    };

let titleCandidates: string[] = [];

// Base-Kandidaten IMMER behalten (auch wenn AI-Titelgenerator crasht)
const baseCands = [
  aiCopy?.seoTitle || "",
  aiCopy?.title || "",
  // neutraler Fallback
  `${keyword}`,
].map(norm).filter(Boolean);

try {
  const aiCands = await generateTitleCandidates(language, keyword, prods, { textModel, min: 4, max: 8 });

  titleCandidates = [...aiCands, ...baseCands]
    .map(norm)
    .filter(Boolean);

} catch (e: any) {
  console.warn("[title] generateTitleCandidates failed -> fallback to baseCands", {
    msg: String(e?.message || e),
  });

  // Wichtig: NICHT auf nur keyword reduzieren, sondern baseCands behalten
  titleCandidates = baseCands;
}



   // 🔒 HARD FILTER: verbotene Wörter + Jahreszahlen final rauswerfen
const forbiddenWordsFromCfg =
  Array.isArray((siteCfg as any)?.style?.forbidden_words)
    ? (siteCfg as any).style.forbidden_words
    : [];

// "test" IMMER verbieten + Jahreszahlen über Regex
const forbiddenWords = Array.from(
  new Set(
    [...forbiddenWordsFromCfg, "test"]
      .map((x: any) => String(x || "").trim())
      .filter(Boolean)
  )
);

// 1️⃣ Wörter filtern
titleCandidates = hardFilterForbidden(titleCandidates, forbiddenWords);

// 2️⃣ Jahreszahlen filtern (z. B. 2023, 2024, 2025)
titleCandidates = titleCandidates.filter(
  t => !/\b(19|20)\d{2}\b/.test(t)
);

// Letzter Notanker: alles bereinigen statt Keyword pur
if (titleCandidates.length === 0) {
  let cleaned = norm(keyword);

  // verbotene Wörter entfernen
  for (const w of forbiddenWords) {
    cleaned = cleaned.replace(
      new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
      ""
    );
  }

  // Jahreszahlen entfernen
  cleaned = cleaned.replace(/\b(19|20)\d{2}\b/g, "").trim();

  titleCandidates = [cleaned].filter(Boolean);
}

const pickedTitleRaw = pickBestTitle(titleCandidates, keyword, language);
const pickedTitle    = norm(pickedTitleRaw);


    aiCopy.title    = pickedTitle;
    aiCopy.seoTitle = pickedTitle;


	// 7) Vergleichstabelle aus PA/Heuristik
	const articleKind  = classifyArticleKind(keyword, prods);
	const tableAuto = chooseTableColumnsAndRows(keyword, prods, { raw: true });
	const tableHeaders = tableAuto.headers; // KEYS
	const tableRows    = tableAuto.rows

	aiCopy.table = { headers: tableHeaders.slice(0, 5), rows: tableRows.slice(0, 4) };


    const inlineAnchors = pickInlineAnchors(aiCopy, slug, category, registry, 4);
    console.log("INLINE-ANCHORS:", inlineAnchors);

    // 8) Markdown rendern
    let mdBody = renderKaufberatungMarkdown(
      keyword,
      prods,
      aiCopy,
      { headers: tableHeaders, rows: tableRows },
      language,
      inlineAnchors
    );

    // interne Inline-Links
    const siteUrl =
	  siteCfg?.domain
		? `https://${String(siteCfg.domain).trim()}`
		: (process.env.SITE_URL || undefined);

    const internalCands = buildInternalLinkCandidates(projectRoot, siteId, siteUrl, category, slug);

    const normMain = normDe(keyword);
    internalCands.sort((a, b) => {
      const aHit = a.keywords.some(k => normDe(k) === normMain);
      const bHit = b.keywords.some(k => normDe(k) === normMain);
      if (aHit && !bHit) return -1;
      if (bHit && !aHit) return 1;
      return (a.title || "").localeCompare(b.title || "");
    });

    const MAX_INTERNAL_INLINE = 2;
    let internalInserted = 0;
    const flags: "g" | "gi" = "gi";
    const usedInternalPhrases = new Set<string>();

    for (const cand of internalCands) {
      if (internalInserted >= MAX_INTERNAL_INLINE) break;
      const phrases = [cand.keywords[0], ...cand.keywords.slice(1)].filter(Boolean);
      const { mdNew, inserted, matchedPhrase } = insertInlineInternalLinkOnce(mdBody, cand.url, phrases, flags);
      if (inserted) {
        mdBody = mdNew;
        internalInserted++;
        if (matchedPhrase) usedInternalPhrases.add(normDe(matchedPhrase));
      }
    }

    // externe/Netzwerk-Links
    const internalKw = loadInternalKeywords(projectRoot, siteId);
    const { rules: netRules, links: centralLinksRaw } = loadCentralNetwork(projectRoot, siteId);
    const centralLinks = centralLinksRaw.filter(l => l && l.url && l.title);

const maxNet = Math.max(0, Number(netRules.maxNetworkLinksPerArticle ?? 3));

let pickedNet: NetworkLink[] = [];
if (maxNet > 0 && centralLinks.length > 0) {
  pickedNet = pickNetworkLinks(centralLinks, {
    mainKeyword: keyword,
    category,
    language,
    reservedInternal: internalKw,
    max: maxNet,
    matchOpts: {
      caseInsensitive: netRules.match?.caseInsensitive !== false,
      stripDiacritics: !!netRules.match?.stripDiacritics
    }
  });
}

let usedIds: string[] = [];
if (pickedNet.length > 0) {
  const inlineCandidate = pickedNet[0];
  if (inlineCandidate && inlineCandidate.url) {
    // Hard-Gate: lieber KEIN Netzwerk-Link als ein falscher.
    // Nur einfügen, wenn Titel/Keywords klar zum Main-Keyword passen.
    const kMain = normDe(keyword);
    const tokens = kMain.split(/\s+/).filter(t => t.length >= 4);

    const titleHit = normDe(inlineCandidate.title || "");
    const kwHits = Array.isArray(inlineCandidate.keywords)
      ? inlineCandidate.keywords.map(k => normDe(k.kw || "")).filter(Boolean)
      : [];

    const strongMatch =
      (tokens.length > 0 && tokens.some(t => titleHit.includes(t))) ||
      (tokens.length > 0 && kwHits.some(k => tokens.some(t => k.includes(t))));

    if (strongMatch) {
      const { mdNew, inserted } = insertInlineNetworkLinkOnce(
        mdBody,
        inlineCandidate,
        keyword,
        {
          caseInsensitive: netRules.match?.caseInsensitive !== false,
          stripDiacritics: !!netRules.match?.stripDiacritics,
        }
      );

      if (inserted) {
        mdBody = mdNew;
        if (inlineCandidate.id) usedIds.push(inlineCandidate.id);
      }
    }
  }
}


    // 9b) Nutzung zentral hochzählen
    if (usedIds.length > 0) {
      bumpCentralNetworkUsage(projectRoot, usedIds);
    }

    // 9) Datei schreiben
    const outDir = path.join(projectRoot, "sites", siteId, "content", category);
    ensureDir(outDir);

    const outFile = path.join(outDir, `${slug}.mdx`);
	// FIX: merken, ob der Artikel schon existierte
	articleExistedBefore = fs.existsSync(outFile);
    const cleanStr = (txt: any) =>
      fixMojibake(decodeHtmlEntities(String(txt ?? ""))).replace(/\s+/g, " ").trim();

	if (!aiCopy.seoTitle && !aiCopy.title) {
	  throw new Error(`AI-Fehler: title fehlt für keyword="${keyword}"`);
	}
	if (!aiCopy.metaDescription) {
	  throw new Error(`AI-Fehler: metaDescription fehlt für keyword="${keyword}"`);
	}

	const h1Title = cleanStr(aiCopy.seoTitle || aiCopy.title);

	const fmObj = {
	  title: h1Title,
	  description: cleanStr(aiCopy.metaDescription),
	  category: String(category),
	  slug: String(slug),
	  pageType,
	  authorId: pickAuthorId(siteCfg, `${keyword}::${category}::${slug}`),
	  createdAt: new Date().toISOString(),
	  heroImage: String(pHero.imgAi || ""),
	  heroImageAlt: cleanStr(pHero.name || aiCopy.title || keyword),
	};


    const fm =
      `---\n` +
      Object.entries(fmObj).map(([k, v]) => `${k}: ${JSON.stringify(v ?? "")}`).join("\n") +
      `\n---\n`;

    const mdBodyFixed = mdBody.replace(
      /<h1[^>]*class="page-title"[^>]*>[\s\S]*?<\/h1>/i,
      `<h1 class="page-title">${escapeHtml(h1Title)}</h1>`
    );

    fs.writeFileSync(outFile, fm + "\n" + mdBodyFixed + "\n", "utf8");

    // 9) Zentralen Netzwerk-Pool updaten
    try {
		const siteUrl =
		  siteCfg?.domain
			? `https://${String(siteCfg.domain).trim()}`
			: process.env.SITE_URL;

      const articlePath = `/${slug}`; // ggf. an deine Route anpassen
      const absoluteUrl = buildArticleUrl(siteUrl, articlePath);
      const domain = (() => { try { return new URL(absoluteUrl).hostname; } catch { return undefined; } })();

      const entry: NetworkLink = {
        id: `${siteId}:${slug}`,
        type: "network",
        siteId,
        domain,
        title: h1Title,
        url: absoluteUrl,
        keywords: [{ kw: keyword, match: "phrase" }],
        language,
        categories: [String(category)],
        group: makeGroupFromKeyword(keyword),
        used: 0,
        usedBy: []
      };

	if (!articleExistedBefore) {
	  upsertCentralNetwork(projectRoot, entry);
	}
    } catch (e) {
      console.warn("[central-network] upsert failed:", e);
    }

    // Roh-AI mitschreiben
    try {
      if (!aiCopy.table || (aiCopy.table.headers?.length !== 5 || aiCopy.table.rows?.length !== 4)) {
        aiCopy.table = { headers: tableHeaders.slice(0, 5), rows: tableRows.slice(0, 4) };
      }
      const aiOutJson = path.join(outDir, `${slug}.ai.json`);
      fs.writeFileSync(aiOutJson, JSON.stringify(aiCopy, null, 2), "utf8");
    } catch {}

    // 🟢 Erfolgsevent (html_len von mdBodyFixed abgeleitet)
    void pirschEvent(
      "article_generated",
      {
        site: siteId,
        language,
        slug,
        html_len: (mdBodyFixed?.length ?? 0),
        ms: Date.now() - t0,
      },
      {
        req,
        url: `${process.env.SITE_URL ?? ""}/api/generate`,
      }
    );

    return NextResponse.json({
      ok: true,
      path: `/${category}/${slug}`,
      writtenTo: outFile,
      siteId,
      language,
      textModel,
      imageModel,
      imageSize,
      imagesSavedUnder: "/ai/",
      aiDebug: {
        title: aiCopy?.title ? 1 : 0,
        takeaways: (aiCopy?.keyTakeaways || []).length,
        criteria: (aiCopy?.criteria || []).length,
        pros: (aiCopy?.pros || []).length,
        cons: (aiCopy?.cons || []).length,
        faq: (aiCopy?.faq || []).length,
        tableHeaders: (aiCopy?.table?.headers || []).length,
        tableRows: (aiCopy?.table?.rows || []).length,
        productDetails: (aiCopy?.productDetails || []).length,
        tableBuiltFromPA: true,
        paItems: prods.map(p => ({ asin: p.asin, hasPA: !!p.paRaw })),
        heroHasAi: !!prods[0].imgAi
      },
      aiSource: "openai",
      promptNonceUsed: Boolean(force),
      comparisonTable
    });
  } catch (error: unknown) {
    const err = error as any; // Alias – ab hier überall 'err' verwenden

    void pirschEvent(
      "article_failed",
      {
        site: siteId,
        language,
        slug,
        code: err?.code ?? "unknown",
        name: err?.name ?? "Error",
        ms: Date.now() - t0,
      },
      {
        req,
        url: `${process.env.SITE_URL ?? ""}/api/generate`,
      }
    );

    console.error("Generate API Error:", err);
    return NextResponse.json(
      { ok: false, error: String(err?.message ?? err), stack: err?.stack ?? null, cwd: process.cwd() },
      { status: 500 }
    );
  }
}

export async function GET() {
	try {
		const siteId = getSiteIdStrictFromRequest(req);;           // FIX: zentrale SITE_ID-Quelle
		const dir = contentRoot(siteId);
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

