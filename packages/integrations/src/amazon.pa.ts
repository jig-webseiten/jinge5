import { default as paapi } from "paapi5-nodejs-sdk";

export async function paapiGetItems(asins: string[], opts: {
  partnerTag: string;
  partnerType: "Associates" | string;
  marketplace: string; // e.g. "www.amazon.de"
  accessKey: string;
  secretKey: string;
}) {
  const defaultClient = paapi.ApiClient.instance;
  defaultClient.accessKey = opts.accessKey;
  defaultClient.secretKey = opts.secretKey;
  defaultClient.host = `webservices.amazon.${opts.marketplace.endsWith(".com") ? "com" : "de"}`;
  defaultClient.region = "eu-west-1";

  const api = new paapi.DefaultApi();
  const req = new paapi.GetItemsRequest();
  req.partnerTag = opts.partnerTag;
  req.partnerType = opts.partnerType as any;
  req.marketplace = opts.marketplace;
  req.itemIds = asins;

  const res = await api.getItems(req);
  return res;
}

export function buildAffiliateUrl(asin: string, tag: string, marketplace = "www.amazon.de") {
  const url = new URL(`https://${marketplace}/dp/${asin}`);
  if (tag) url.searchParams.set("tag", tag);
  return url.toString();
}
