import * as cheerio from "cheerio";
import { assertPublicUrl, UserError } from "./urlGuard.js";

const MAX_REDIRECTS = 3;
const MAX_BYTES = 2_000_000;
const MAX_CHARS = 12_000;

async function readCapped(res) {
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > MAX_BYTES) {
      await reader.cancel();
      break;                       // keep what we have
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function fetchPage(rawUrl) {
  let current = rawUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);     // checked again on every redirect
    let res;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PageSummarizer/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
    } catch {
      throw new UserError("Could not reach that website (it timed out or refused the connection).", 502);
    }

    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      current = new URL(location, url).toString();
      continue;
    }
    if (!res.ok) throw new UserError(`The website returned an error (HTTP ${res.status}).`, 502);
    if (!(res.headers.get("content-type") || "").includes("text/html")) {
      throw new UserError("That URL is not an HTML page.", 422);
    }
    return readCapped(res);
  }
  throw new UserError("Too many redirects.", 502);
}

export async function scrapeText(rawUrl) {
  const html = await fetchPage(rawUrl);
  const $ = cheerio.load(html);

  const title = $("title").first().text().trim();
  $("script, style, noscript, nav, footer, header, aside, form, iframe, svg").remove();
  $("br, p, div, li, h1, h2, h3, h4, h5, h6, tr, td, th, section").append(" ");  // keep words apart

  const root = $("article").length ? $("article").first()
             : $("main").length ? $("main").first()
             : $("body");
  const text = root.text().replace(/\s+/g, " ").trim();

  if (text.length < 200) {
    throw new UserError("Couldn't find enough readable text on that page. It may need JavaScript to load.", 422);
  }
  return { title, text: text.slice(0, MAX_CHARS), truncated: text.length > MAX_CHARS };
}