"use client";

import { track } from "@vercel/analytics";

type Props = {
  href: string;
  asin?: string;
  siteId?: string;
  children: React.ReactNode;
};

export function AmazonLink({ href, asin, siteId, children }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow sponsored"
      onClick={() => {
        track("amazon_click", {
          page: window.location.pathname,
          asin: asin ?? "",
          siteId: siteId ?? "",
        });
      }}
    >
      {children}
    </a>
  );
}
