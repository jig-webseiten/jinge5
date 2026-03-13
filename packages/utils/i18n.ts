
export function t(key: string, lang: "de" | "en" | "fr" = "de") {
  const dict: Record<string, Record<string, string>> = {
    de: { buy_now: "Jetzt kaufen" },
    en: { buy_now: "Buy now" },
    fr: { buy_now: "Acheter" }
  };
  return dict[lang]?.[key] ?? key;
}
