import path from "path";
import crypto from "crypto";
import type {
  Config,
  SiteAnalysis,
  ExistingArticle,
  ArticleBrief,
  ContentGap,
  PlanResult,
} from "../types.js";
import { generateJsonWithClaude } from "../utils/claude.js";
import { getSiteOutputDir } from "../utils/config.js";
import { writeJson, readJson, slugify } from "../utils/storage.js";

// Available gradient presets for article theming
const GRADIENT_OPTIONS = ["blue", "purple", "green", "orange", "teal", "slate", "rose", "amber", "indigo", "cyan"];
const PATTERN_OPTIONS = ["dots", "grid", "waves", "circuit"];
const CATEGORY_OPTIONS = ["Engineering", "Strategy", "Leadership", "Compliance", "Product", "Operations", "Security"];

const PLANNING_SYSTEM_PROMPT = `You are an expert content strategist specializing in B2B and technology content marketing. Your task is to analyze a brand's existing content and recommend new articles to fill gaps and expand their reach.

Given the site analysis and existing articles, generate a strategic content plan. Return JSON with this structure:

{
  "gaps": [
    {
      "topic": "Topic name",
      "priority": "high|medium|low",
      "rationale": "Why this is a gap",
      "suggestedAngles": ["angle 1", "angle 2"]
    }
  ],
  "articles": [
    {
      "slug": "url-friendly-slug",
      "title": "Compelling article title",
      "subtitle": "A brief subtitle that expands on the title (one sentence)",
      "topic": "Primary topic",
      "category": "${CATEGORY_OPTIONS.join("|")}",
      "angle": "Unique angle/perspective",
      "targetAudience": "Specific audience segment",
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "outline": ["Section 1", "Section 2", "Section 3", "Section 4", "Section 5"],
      "targetLength": 1500,
      "platform": "both",
      "gradient": "${GRADIENT_OPTIONS.join("|")}",
      "pattern": "${PATTERN_OPTIONS.join("|")}",
      "readTime": "8 min read"
    }
  ]
}

Guidelines:
- Prioritize topics that align with the brand's value propositions
- Create titles that are compelling and SEO-friendly
- Include a punchy subtitle that hooks the reader
- Generate a URL-friendly slug (lowercase, hyphens, no special characters)
- Assign a category that best fits the content
- Mix content types: how-to guides, thought leadership, case study angles
- Articles should be 1500-2500 words for comprehensive coverage
- Always set platform to "both" (Medium and LinkedIn)
- Assign visual theming: pick a gradient color and pattern that matches the topic mood:
  - blue/indigo: technical, engineering topics
  - green/teal: growth, strategy, success topics
  - purple: leadership, vision topics
  - orange/amber: warnings, mistakes, learning topics
  - slate: compliance, security topics
  - rose/cyan: creative, design, UX topics
- Calculate readTime based on targetLength (roughly 200 words per minute)
- Include 5 keywords for SEO
- Create 5-section outlines that include Mermaid diagram opportunities`;

export async function planArticles(
  url: string,
  config: Config
): Promise<PlanResult> {
  const outputDir = getSiteOutputDir(config, url);

  // Load site analysis
  const analysis = await readJson<SiteAnalysis>(
    path.join(outputDir, "site-analysis.json")
  );
  if (!analysis) {
    throw new Error(
      "Site analysis not found. Run `blog-builder analyze` first."
    );
  }

  // Load existing articles if available
  const inventory = await readJson<{
    articles: ExistingArticle[];
  }>(path.join(outputDir, "existing-articles.json"));

  const existingArticles = inventory?.articles || [];

  // Build context for Claude
  const context = buildPlanningContext(analysis, existingArticles, config);

  // Generate plan with Claude
  const planData = await generateJsonWithClaude<{
    gaps: ContentGap[];
    articles: Omit<ArticleBrief, "id" | "status">[];
  }>(
    config,
    PLANNING_SYSTEM_PROMPT,
    context,
    { maxTokens: 8192, temperature: 0.8 }
  );

  // Add IDs and status to articles, ensure all required fields
  const articles: ArticleBrief[] = planData.articles
    .slice(0, config.articleCount)
    .map((article, index) => ({
      ...article,
      id: generateId(),
      status: "planned" as const,
      // Ensure defaults for any missing fields
      slug: article.slug || slugify(article.title),
      subtitle: article.subtitle || article.angle,
      category: article.category || "Engineering",
      gradient: article.gradient || GRADIENT_OPTIONS[index % GRADIENT_OPTIONS.length],
      pattern: (article.pattern || PATTERN_OPTIONS[index % PATTERN_OPTIONS.length]) as "dots" | "grid" | "waves" | "circuit",
      readTime: article.readTime || `${Math.ceil(article.targetLength / 200)} min read`,
    }));

  // Save plan
  const planPath = path.join(outputDir, "article-plan.json");
  await writeJson(planPath, {
    generatedAt: new Date().toISOString(),
    siteUrl: url,
    gaps: planData.gaps,
    articles,
  });

  // Update blog-plan.md with recommendations
  await updateBlogPlanWithArticles(outputDir, articles, planData.gaps);

  return { articles, gaps: planData.gaps, planPath };
}

function buildPlanningContext(
  analysis: SiteAnalysis,
  existingArticles: ExistingArticle[],
  config: Config
): string {
  let context = `# Site Analysis

**Brand:** ${analysis.name}
**Industry:** ${analysis.industry}
**Description:** ${analysis.description}

## Target Audience
${analysis.targetAudience.map((a) => `- ${a}`).join("\n")}

## Value Propositions
${analysis.valuePropositions.map((v) => `- ${v}`).join("\n")}

## Key Topics
${analysis.keyTopics.map((t) => `- ${t}`).join("\n")}

## Brand Voice
- Tone: ${analysis.brandVoice.tone}
- Formality: ${analysis.brandVoice.formality}
- Style: ${analysis.brandVoice.sentenceStyle}

`;

  if (existingArticles.length > 0) {
    context += `## Existing Articles (${existingArticles.length} found)

${existingArticles
  .map(
    (a) => `- **${a.title}**
  Topics: ${a.topics.join(", ")}
  Length: ${a.wordCount} words`
  )
  .join("\n\n")}

`;
  } else {
    context += `## Existing Articles
No existing blog articles found. This is a fresh start!

`;
  }

  if (config.topics && config.topics.length > 0) {
    context += `## Requested Focus Topics
${config.topics.map((t) => `- ${t}`).join("\n")}

`;
  }

  context += `## Task
Generate ${config.articleCount} article recommendations that:
1. Fill content gaps based on the brand's offerings
2. Target the identified audience segments
3. Align with the brand voice
4. Are suitable for Medium and/or LinkedIn
5. Mix educational, thought leadership, and practical how-to content
`;

  return context;
}

async function updateBlogPlanWithArticles(
  outputDir: string,
  articles: ArticleBrief[],
  gaps: ContentGap[]
): Promise<void> {
  const planPath = path.join(outputDir, "blog-plan.md");

  // Read existing plan
  const { readMarkdown, writeMarkdown } = await import("../utils/storage.js");
  let content = await readMarkdown(planPath);
  if (!content) return;

  // Add gaps section
  const gapsSection = `## Content Gaps

${gaps.map((g) => `### ${g.topic} (${g.priority} priority)
${g.rationale}

**Suggested Angles:**
${g.suggestedAngles.map((a) => `- ${a}`).join("\n")}
`).join("\n")}`;

  // Add recommended articles section
  const articlesSection = `## Recommended Articles

${articles.map((a, i) => `### ${i + 1}. ${a.title}

> ${a.subtitle}

- **Slug:** ${a.slug}
- **Category:** ${a.category}
- **Topic:** ${a.topic}
- **Angle:** ${a.angle}
- **Target Audience:** ${a.targetAudience}
- **Platform:** ${a.platform}
- **Target Length:** ${a.targetLength} words (~${a.readTime})
- **Keywords:** ${a.keywords.join(", ")}
- **Visual Theme:** ${a.gradient} gradient, ${a.pattern} pattern

**Outline:**
${a.outline.map((s) => `1. ${s}`).join("\n")}
`).join("\n---\n\n")}`;

  // Replace placeholder sections
  content = content.replace(
    /## Content Inventory[\s\S]*?(?=## Recommended Articles|## Next Steps)/,
    gapsSection + "\n\n"
  );
  content = content.replace(
    /## Recommended Articles[\s\S]*?(?=## Next Steps)/,
    articlesSection + "\n\n"
  );

  await writeMarkdown(planPath, content);
}

function generateId(): string {
  return `article-${crypto.randomUUID().slice(0, 8)}`;
}
