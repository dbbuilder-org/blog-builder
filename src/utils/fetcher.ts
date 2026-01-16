import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface FetchOptions {
  timeout?: number;
  userAgent?: string;
}

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (compatible; BlogBuilder/1.0; +https://github.com/dbbuilder-org/blog-builder)";

export async function fetchPage(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const { timeout = 30000, userAgent = DEFAULT_USER_AGENT } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout,
        headers: {
          "User-Agent": userAgent,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
      });

      return response.data;
    } catch (error) {
      lastError = error as Error;

      if (error instanceof AxiosError) {
        // Don't retry on 4xx errors (except 429)
        if (
          error.response?.status &&
          error.response.status >= 400 &&
          error.response.status < 500 &&
          error.response.status !== 429
        ) {
          throw new Error(`Failed to fetch ${url}: ${error.response.status}`);
        }
      }

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }

  throw new Error(
    `Failed to fetch ${url} after ${MAX_RETRIES} attempts: ${lastError?.message}`
  );
}

export function extractMainContent(html: string): string {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $(
    "script, style, nav, header, footer, aside, .sidebar, .navigation, .menu, .footer, .header, .ads, .advertisement, .cookie-banner, .popup"
  ).remove();

  // Try to find main content area
  const mainSelectors = [
    "main",
    "article",
    '[role="main"]',
    ".content",
    ".main-content",
    "#content",
    "#main",
    ".post-content",
    ".entry-content",
    ".article-content",
  ];

  let content = "";

  for (const selector of mainSelectors) {
    const element = $(selector).first();
    if (element.length) {
      content = element.text();
      break;
    }
  }

  // Fallback to body
  if (!content) {
    content = $("body").text();
  }

  // Clean up whitespace
  return content
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

export function extractMetadata(html: string): {
  title: string;
  description: string;
  keywords: string[];
} {
  const $ = cheerio.load(html);

  const title =
    $("title").text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    $("h1").first().text().trim() ||
    "";

  const description =
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    "";

  const keywordsStr = $('meta[name="keywords"]').attr("content") || "";
  const keywords = keywordsStr
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  return { title, description, keywords };
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const links: string[] = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    try {
      const url = new URL(href, base);

      // Only include same-domain links
      if (url.hostname === base.hostname) {
        links.push(url.href);
      }
    } catch {
      // Invalid URL, skip
    }
  });

  return [...new Set(links)];
}

export function findBlogLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const blogLinks: string[] = [];

  const blogPatterns = [
    /\/blog\/?$/i,
    /\/blog\//i,
    /\/news\/?$/i,
    /\/news\//i,
    /\/articles?\/?$/i,
    /\/articles?\//i,
    /\/posts?\/?$/i,
    /\/posts?\//i,
    /\/insights?\/?$/i,
    /\/resources?\/?$/i,
  ];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    try {
      const url = new URL(href, base);

      if (url.hostname === base.hostname) {
        const path = url.pathname;
        if (blogPatterns.some((pattern) => pattern.test(path))) {
          blogLinks.push(url.href);
        }
      }
    } catch {
      // Invalid URL, skip
    }
  });

  return [...new Set(blogLinks)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
