import path from "path";
import type { Config, ExistingArticle, DiscoverResult } from "../types.js";
import {
  fetchPage,
  extractMainContent,
  extractMetadata,
  findBlogLinks,
  extractLinks,
} from "../utils/fetcher.js";
import { getSiteOutputDir, getDomainFromUrl } from "../utils/config.js";
import { writeJson, readJson } from "../utils/storage.js";
import * as cheerio from "cheerio";

export async function discoverArticles(
  url: string,
  config: Config
): Promise<DiscoverResult> {
  const outputDir = getSiteOutputDir(config, url);
  const articles: ExistingArticle[] = [];

  // Fetch main page and find blog section
  const mainHtml = await fetchPage(url);
  const blogLinks = findBlogLinks(mainHtml, url);

  if (blogLinks.length === 0) {
    // Try common blog paths
    const base = new URL(url);
    const commonPaths = ["/blog", "/news", "/articles", "/insights", "/resources"];
    for (const pathStr of commonPaths) {
      try {
        const blogUrl = new URL(pathStr, base).href;
        const html = await fetchPage(blogUrl);
        const links = findBlogLinks(html, blogUrl);
        blogLinks.push(...links);
        if (links.length > 0) break;
        await sleep(config.rateLimit);
      } catch {
        // Path doesn't exist, continue
      }
    }
  }

  // Find the main blog listing page
  let blogListingUrl = blogLinks.find(
    (l) => /\/(blog|news|articles)\/?$/i.test(new URL(l).pathname)
  );

  if (!blogListingUrl && blogLinks.length > 0) {
    blogListingUrl = blogLinks[0];
  }

  if (blogListingUrl) {
    // Fetch blog listing and extract article links
    const listingHtml = await fetchPage(blogListingUrl);
    const articleUrls = extractArticleLinks(listingHtml, blogListingUrl);

    // Fetch individual articles
    for (const articleUrl of articleUrls.slice(0, 20)) {
      // Limit to 20 articles
      try {
        const article = await fetchArticle(articleUrl, config);
        if (article) {
          articles.push(article);
        }
        await sleep(config.rateLimit);
      } catch {
        // Skip failed articles
      }
    }
  }

  // Save inventory
  const inventoryPath = path.join(outputDir, "existing-articles.json");
  await writeJson(inventoryPath, {
    discoveredAt: new Date().toISOString(),
    blogUrl: blogListingUrl || null,
    articleCount: articles.length,
    articles,
  });

  return { articles, inventoryPath };
}

function extractArticleLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const articleUrls: string[] = [];

  // Common article link patterns
  const articleSelectors = [
    "article a",
    ".post a",
    ".blog-post a",
    ".article-card a",
    ".entry a",
    ".news-item a",
    '[class*="article"] a',
    '[class*="post"] a',
    "h2 a",
    "h3 a",
  ];

  for (const selector of articleSelectors) {
    $(selector).each((_, element) => {
      const href = $(element).attr("href");
      if (!href) return;

      try {
        const url = new URL(href, base);
        if (url.hostname === base.hostname && !articleUrls.includes(url.href)) {
          // Filter out obvious non-articles
          const path = url.pathname;
          if (
            !path.match(/\/(tag|category|author|page|search|login|signup)/i) &&
            path !== base.pathname
          ) {
            articleUrls.push(url.href);
          }
        }
      } catch {
        // Invalid URL
      }
    });
  }

  return [...new Set(articleUrls)];
}

async function fetchArticle(
  url: string,
  config: Config
): Promise<ExistingArticle | null> {
  const html = await fetchPage(url);
  const $ = cheerio.load(html);
  const metadata = extractMetadata(html);
  const content = extractMainContent(html);

  if (!metadata.title || content.length < 100) {
    return null; // Not a real article
  }

  // Try to extract publish date
  const dateSelectors = [
    'time[datetime]',
    '[class*="date"]',
    '[class*="published"]',
    'meta[property="article:published_time"]',
  ];

  let publishedAt: string | undefined;
  for (const selector of dateSelectors) {
    const element = $(selector).first();
    if (element.length) {
      publishedAt =
        element.attr("datetime") ||
        element.attr("content") ||
        element.text().trim();
      if (publishedAt) break;
    }
  }

  // Extract excerpt
  const excerpt =
    metadata.description ||
    content.slice(0, 200).replace(/\s+/g, " ").trim() + "...";

  // Simple topic extraction based on content keywords
  const topics = extractTopicsFromContent(content, metadata.keywords);

  return {
    url,
    title: metadata.title,
    publishedAt,
    excerpt,
    topics,
    wordCount: content.split(/\s+/).length,
    content: content.slice(0, 5000), // Store first 5000 chars for analysis
  };
}

function extractTopicsFromContent(
  content: string,
  keywords: string[]
): string[] {
  // Start with meta keywords if available
  const topics = [...keywords];

  // Add common topic patterns found in content
  const contentLower = content.toLowerCase();
  const topicPatterns = [
    "ai",
    "artificial intelligence",
    "machine learning",
    "startup",
    "saas",
    "product",
    "development",
    "engineering",
    "design",
    "marketing",
    "growth",
    "security",
    "compliance",
    "data",
    "analytics",
    "cloud",
    "mobile",
    "web",
  ];

  for (const pattern of topicPatterns) {
    if (contentLower.includes(pattern) && !topics.includes(pattern)) {
      topics.push(pattern);
    }
  }

  return topics.slice(0, 5); // Limit to 5 topics
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
