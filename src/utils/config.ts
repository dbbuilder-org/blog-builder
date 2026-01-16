import os from "os";
import path from "path";
import type { Config } from "../types.js";

interface CLIOptions {
  output?: string;
  count?: string;
  topics?: string;
  verbose?: boolean;
}

export function getConfig(options: CLIOptions): Config {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required.\n" +
        "Set it with: export ANTHROPIC_API_KEY=sk-ant-..."
    );
  }

  const defaultOutput =
    process.env.BLOG_BUILDER_OUTPUT || path.join(os.homedir(), ".blog-builder");

  return {
    outputDir: options.output || defaultOutput,
    articleCount: parseInt(
      options.count || process.env.BLOG_BUILDER_ARTICLE_COUNT || "10",
      10
    ),
    topics: options.topics?.split(",").map((t) => t.trim()),
    verbose: options.verbose || false,
    rateLimit: parseInt(process.env.BLOG_BUILDER_RATE_LIMIT || "1000", 10),
    anthropicApiKey: apiKey,
  };
}

export function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

export function getSiteOutputDir(config: Config, url: string): string {
  const domain = getDomainFromUrl(url);
  return path.join(config.outputDir, domain);
}
