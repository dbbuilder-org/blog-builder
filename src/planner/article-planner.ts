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
import { writeJson, readJson } from "../utils/storage.js";

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
      "title": "Compelling article title",
      "topic": "Primary topic",
      "angle": "Unique angle/perspective",
      "targetAudience": "Specific audience segment",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "outline": ["Section 1", "Section 2", "Section 3", "Section 4"],
      "targetLength": 1500,
      "platform": "medium|linkedin|both"
    }
  ]
}

Guidelines:
- Prioritize topics that align with the brand's value propositions
- Create titles that are compelling and SEO-friendly
- Mix content types: how-to guides, thought leadership, case study angles
- LinkedIn articles should be shorter (800-1200 words), Medium can be longer (1500-3000)
- Include a mix of top-of-funnel (awareness) and bottom-of-funnel (decision) content`;

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

  // Add IDs and status to articles
  const articles: ArticleBrief[] = planData.articles
    .slice(0, config.articleCount)
    .map((article) => ({
      ...article,
      id: generateId(),
      status: "planned" as const,
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

- **Topic:** ${a.topic}
- **Angle:** ${a.angle}
- **Target Audience:** ${a.targetAudience}
- **Platform:** ${a.platform}
- **Target Length:** ${a.targetLength} words
- **Keywords:** ${a.keywords.join(", ")}

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
