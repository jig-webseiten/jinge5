
export type InputPayload = {
  siteId: string;
  asin: string;
  articleType: "produkttest" | "bestof" | "info" | "kaufberatung";
  language: "de" | "en" | "fr";
};

export type GeneratedArticle = {
  category: string;
  slug: string;
  mdx: string;
};
