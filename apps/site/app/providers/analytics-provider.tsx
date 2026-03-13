"use client";

import Script from "next/script";

type Props = {
  code: string;
  exclude?: string;     // kommagetrennte Regexe
  enableDevForHost?: string; // z.B. "garden-hero.de" um localhost zu testen
};

export default function AnalyticsProvider({ code, exclude, enableDevForHost }: Props) {
  if (!code) return null;

  // FIX: Pirsch-Snippet im <head> via next/script
  return (
    <Script
      id="pirsch"
      src="https://api.pirsch.io/pa.js"
      defer
      strategy="afterInteractive"
      data-code={code}
      {...(exclude ? { "data-exclude": exclude } : {})}
      {...(process.env.NODE_ENV !== "production" && enableDevForHost
        ? { "data-dev": enableDevForHost }
        : {})}
    />
  );
}
