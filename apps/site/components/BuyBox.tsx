
export function BuyBox({ asin }: { asin: string }) {
  // Platzhalter – später Preis/Zeitstempel über PA-API
  const partnerTag = process.env.AMAZON_PA_PARTNER_TAG ?? "";
  const url = `https://www.amazon.de/dp/${asin}?tag=${partnerTag}`;
  return (
    <div role="complementary" aria-label="Kaufbox">
      <a href={url} rel="nofollow sponsored noopener" target="_blank">Jetzt bei Amazon ansehen</a>
      <p className="price-note">Preis kann sich seit dem Abruf geändert haben.</p>
    </div>
  );
}
