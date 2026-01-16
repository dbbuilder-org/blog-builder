import path from "path";
import type {
  Config,
  SiteAnalysis,
  ArticleBrief,
  GeneratedArticle,
  GenerateResult,
} from "../types.js";
import { generateWithClaude } from "../utils/claude.js";
import { getSiteOutputDir } from "../utils/config.js";
import { writeMarkdown, writeJson, readJson, ensureDir, slugify } from "../utils/storage.js";

const ARTICLE_SYSTEM_PROMPT = `You are an expert content writer who creates engaging, informative articles for business blogs. You write in a clear, authoritative style that provides genuine value to readers.

Your articles should:
- Start with a compelling hook that draws readers in
- Use clear headings and subheadings for scannability
- Include practical examples and actionable takeaways
- End with a strong conclusion and call-to-action
- Be well-researched and substantive, not fluffy
- Match the specified brand voice and tone

Format your response as a complete Markdown article with proper heading hierarchy (# for title, ## for sections, ### for subsections).`;

const MEDIUM_SYSTEM_PROMPT = `You are formatting an article for Medium publication. Medium-specific requirements:
- Use pull quotes (> blockquotes) for key insights
- Add [Image: description] placeholders where visuals would help
- Include suggested tags at the end
- Keep paragraphs short (2-3 sentences)
- Use bold for emphasis on key terms
- Add a "TL;DR" or key takeaways section if article is long`;

const LINKEDIN_SYSTEM_PROMPT = `You are formatting an article for LinkedIn. LinkedIn-specific requirements:
- Start with an attention-grabbing first line (the hook that appears in feed)
- Keep total length under 3000 characters
- Use short paragraphs (1-2 sentences)
- Add line breaks between paragraphs for mobile readability
- Include 3-5 relevant hashtags at the end
- End with a question or call-to-action to encourage engagement
- Avoid jargon, write conversationally`;

export async function generateArticles(
  url: string,
  config: Config
): Promise<GenerateResult> {
  const outputDir = getSiteOutputDir(config, url);
  const articlesOutputDir = path.join(outputDir, "output");
  await ensureDir(articlesOutputDir);

  // Load site analysis for brand voice
  const analysis = await readJson<SiteAnalysis>(
    path.join(outputDir, "site-analysis.json")
  );
  if (!analysis) {
    throw new Error("Site analysis not found. Run `blog-builder analyze` first.");
  }

  // Load article plan
  const plan = await readJson<{
    articles: ArticleBrief[];
  }>(path.join(outputDir, "article-plan.json"));
  if (!plan) {
    throw new Error("Article plan not found. Run `blog-builder plan` first.");
  }

  const generatedArticles: GeneratedArticle[] = [];
  const articlesToGenerate = plan.articles
    .filter((a) => a.status !== "generated")
    .slice(0, config.articleCount);

  for (const brief of articlesToGenerate) {
    const article = await generateSingleArticle(brief, analysis, config);
    generatedArticles.push(article);

    // Save article files
    const articleDir = path.join(articlesOutputDir, slugify(brief.title));
    await ensureDir(articleDir);

    await writeMarkdown(path.join(articleDir, "article.md"), article.content);

    if (article.mediumContent) {
      await writeMarkdown(path.join(articleDir, "medium.md"), article.mediumContent);
    }

    if (article.linkedinContent) {
      await writeMarkdown(path.join(articleDir, "linkedin.md"), article.linkedinContent);
    }

    await writeJson(path.join(articleDir, "metadata.json"), {
      ...article,
      content: undefined, // Don't duplicate content in JSON
      mediumContent: undefined,
      linkedinContent: undefined,
    });

    // Update brief status
    brief.status = "generated";
  }

  // Update plan with generated status
  await writeJson(path.join(outputDir, "article-plan.json"), plan);

  return { articles: generatedArticles, outputPath: articlesOutputDir };
}

async function generateSingleArticle(
  brief: ArticleBrief,
  analysis: SiteAnalysis,
  config: Config
): Promise<GeneratedArticle> {
  // Build the prompt for article generation
  const articlePrompt = buildArticlePrompt(brief, analysis);

  // Generate main article
  const content = await generateWithClaude(
    config,
    ARTICLE_SYSTEM_PROMPT,
    articlePrompt,
    { maxTokens: 4096, temperature: 0.7 }
  );

  // Generate platform-specific versions
  let mediumContent: string | undefined;
  let linkedinContent: string | undefined;

  if (brief.platform === "medium" || brief.platform === "both") {
    mediumContent = await generateWithClaude(
      config,
      MEDIUM_SYSTEM_PROMPT,
      `Format this article for Medium publication:\n\n${content}`,
      { maxTokens: 4096, temperature: 0.5 }
    );
  }

  if (brief.platform === "linkedin" || brief.platform === "both") {
    linkedinContent = await generateWithClaude(
      config,
      LINKEDIN_SYSTEM_PROMPT,
      `Adapt this article for LinkedIn (under 3000 characters, engaging format):\n\n${content}`,
      { maxTokens: 2048, temperature: 0.6 }
    );
  }

  // Extract excerpt and meta description
  const excerpt = extractExcerpt(content);
  const metaDescription = excerpt.slice(0, 160);

  return {
    briefId: brief.id,
    title: brief.title,
    content,
    excerpt,
    metaDescription,
    tags: brief.keywords,
    mediumContent,
    linkedinContent,
    generatedAt: new Date().toISOString(),
  };
}

function buildArticlePrompt(brief: ArticleBrief, analysis: SiteAnalysis): string {
  return `Write a ${brief.targetLength}-word article with the following specifications:

**Title:** ${brief.title}

**Topic:** ${brief.topic}

**Angle/Perspective:** ${brief.angle}

**Target Audience:** ${brief.targetAudience}

**Keywords to Include:** ${brief.keywords.join(", ")}

**Outline:**
${brief.outline.map((s, i) => `${i + 1}. ${s}`).join("\n")}

**Brand Voice Guidelines:**
- Tone: ${analysis.brandVoice.tone}
- Formality: ${analysis.brandVoice.formality}
- Style: ${analysis.brandVoice.sentenceStyle}
- Key vocabulary: ${analysis.brandVoice.vocabulary.join(", ")}
- Avoid: ${analysis.brandVoice.avoidWords.join(", ")}

**Brand Context:**
${analysis.name} is a ${analysis.industry} company that ${analysis.description}.
Their key value propositions are: ${analysis.valuePropositions.join(", ")}.

Write a complete, publication-ready article following the outline. Make it informative, engaging, and actionable.`;
}

function extractExcerpt(content: string): string {
  // Skip the title and get first paragraph
  const lines = content.split("\n").filter((l) => l.trim());
  const firstParagraph = lines.find(
    (l) => !l.startsWith("#") && l.length > 50
  );
  return firstParagraph?.slice(0, 300).trim() + "..." || "";
}
