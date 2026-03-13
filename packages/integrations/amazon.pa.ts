// packages/integrations/amazon.pa.ts
import crypto from "node:crypto";
import https from "node:https";

type PAItemsResult = Record<string, any>;

const ENDPOINTS: Record<string, string> = {
  DE: "webservices.amazon.de",
  UK: "webservices.amazon.co.uk",
  US: "webservices.amazon.com",
  FR: "webservices.amazon.fr",
  IT: "webservices.amazon.it",
  ES: "webservices.amazon.es",
};

function getEnv() {
  const partnerTag =
    process.env.AMAZON_PA_PARTNER_TAG ||
    process.env.AMAZON_PARTNER_TAG ||
    "";
  const accessKey =
    process.env.AMAZON_PA_ACCESS_KEY ||
    process.env.AMAZON_ACCESS_KEY_ID ||
    "";
  const secretKey =
    process.env.AMAZON_PA_SECRET_KEY ||
    process.env.AMAZON_SECRET_ACCESS_KEY ||
    "";
  const locale = (process.env.AMAZON_PA_LOCALE || "DE").toUpperCase();
  const host = ENDPOINTS[locale] || ENDPOINTS.DE;

  return { partnerTag, accessKey, secretKey, host, locale };
}

export function buildAffiliateUrl(asin: string) {
  const { partnerTag, locale } = getEnv();
  const domain = locale === "DE" ? "amazon.de" :
                 locale === "FR" ? "amazon.fr" :
                 locale === "IT" ? "amazon.it" :
                 locale === "ES" ? "amazon.es" :
                 locale === "UK" ? "amazon.co.uk" : "amazon.com";
  const tagParam = partnerTag ? `?tag=${encodeURIComponent(partnerTag)}` : "";
  return `https://www.${domain}/dp/${asin}${tagParam}`;
}

function isoNow() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Minimaler Signer für PA‑API v5 (Items) */
function sign(payload: any, host: string, accessKey: string, secretKey: string) {
  const service = "ProductAdvertisingAPI";
  const region = host.includes(".de") || host.includes(".fr") || host.includes(".es") || host.includes(".it") || host.includes(".co.uk") ? "eu-west-1" : "us-east-1";
  const amzTarget = "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems";
  const body = JSON.stringify(payload);

  const headers: Record<string,string> = {
    "content-encoding": "amz-1.0",
    "content-type": "application/json; charset=UTF-8",
    host,
    "x-amz-target": amzTarget,
    "x-amz-date": isoNow().replace(/[-:]/g, "").replace("Z", "Z"),
  };

  // SigV4
  // Canonical request
  const signedHeaders = "content-encoding;content-type;host;x-amz-date;x-amz-target";
  const canonical = [
    "POST",
    "/paapi5/getitems",
    "",
    `content-encoding:${headers["content-encoding"]}\ncontent-type:${headers["content-type"]}\nhost:${headers.host}\nx-amz-date:${headers["x-amz-date"]}\nx-amz-target:${headers["x-amz-target"]}\n`,
    signedHeaders,
    crypto.createHash("sha256").update(body).digest("hex"),
  ].join("\n");

  // String to sign
  const date = headers["x-amz-date"].slice(0, 8);
  const scope = `${date}/${region}/${service}/aws4_request`;
  const toSign = [
    "AWS4-HMAC-SHA256",
    headers["x-amz-date"],
    scope,
    crypto.createHash("sha256").update(canonical).digest("hex"),
  ].join("\n");

  // Derive key
  const kDate = crypto.createHmac("sha256", "AWS4" + secretKey).update(date).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
  const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();

  const signature = crypto.createHmac("sha256", kSigning).update(toSign).digest("hex");

  const auth = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { headers: { ...headers, Authorization: auth }, body };
}

function httpsPost(host: string, body: string, headers: Record<string,string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { host, path: "/paapi5/getitems", method: "POST", headers },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`PA-API HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Holt Items in einer Map { ASIN: RawItem }.
 * WICHTIG: Die Resources-Liste ist bewusst umfangreich,
 * damit Titel, Feature-Bullets, PowerSource, Maße/Gewicht, Bilder ankommen.
 */
export async function paapiGetItems(asins: string[]): Promise<PAItemsResult> {
  const { partnerTag, accessKey, secretKey, host, locale } = getEnv();
  if (!partnerTag || !accessKey || !secretKey) {
    throw new Error("PA-API Credentials/PartnerTag fehlen. Prüfe .env (.local)!");
  }

  const payload = {
    ItemIds: asins,
    PartnerTag: partnerTag,
    PartnerType: "Associates",
    Marketplace: locale === "DE" ? "www.amazon.de"
                : locale === "FR" ? "www.amazon.fr"
                : locale === "IT" ? "www.amazon.it"
                : locale === "ES" ? "www.amazon.es"
                : locale === "UK" ? "www.amazon.co.uk"
                : "www.amazon.com",
    Resources: [
	  // Bilder
	  "Images.Primary.Small",
	  "Images.Primary.Medium",
	  "Images.Primary.Large",

	  // ItemInfo (Texte, Marken, Specs)
	  "ItemInfo.Title",
	  "ItemInfo.ByLineInfo",
	  "ItemInfo.Features",
	  "ItemInfo.ProductInfo",
	  "ItemInfo.TechnicalInfo",

	  // (optional) Kategorien
	  "BrowseNodeInfo.BrowseNodes"
	]


  };

  const { headers, body } = sign(payload, host, accessKey, secretKey);
  const respText = await httpsPost(host, body, headers);
  const resp = JSON.parse(respText);

  const items = (resp?.ItemsResult?.Items || []) as any[];
  const out: PAItemsResult = {};
  for (const it of items) {
    const asin = it.ASIN || it.asin;
    if (asin) out[asin] = it;
  }
  return out;
}
