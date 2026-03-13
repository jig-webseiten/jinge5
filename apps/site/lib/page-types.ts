// apps/site/lib/page-types.ts

export const PAGE_TYPES = [
  "best-of",
  "einzelprodukt",
  "marke",
  "eigenschaften",
  "ratgeber",
  "zubehoer",
] as const;

export type PageType = (typeof PAGE_TYPES)[number];

export const DEFAULT_PAGE_TYPE: PageType = "ratgeber";

export function isPageType(value: unknown): value is PageType {
  return typeof value === "string" && PAGE_TYPES.includes(value as PageType);
}

export function normalizePageType(value: unknown): PageType {
  return isPageType(value) ? value : DEFAULT_PAGE_TYPE;
}