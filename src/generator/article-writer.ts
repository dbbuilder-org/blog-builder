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

**IMPORTANT: Use Mermaid diagrams throughout to visualize concepts.** Include 3-6 Mermaid diagrams per article using:
- flowchart/graph for processes and relationships
- gantt for timelines
- subgraph for grouping related concepts
- style directives for emphasis

Example Mermaid diagram:
\`\`\`mermaid
flowchart TB
    subgraph Process["Development Process"]
        A[Plan] --> B[Build]
        B --> C[Test]
        C --> D[Deploy]
    end
\`\`\`

Format your response as a complete Markdown article with proper heading hierarchy (# for title, ## for sections, ### for subsections). Include Mermaid code blocks where visual diagrams would help explain concepts.`;

const MEDIUM_SYSTEM_PROMPT = `You are formatting an article for Medium publication. Medium-specific requirements:

**Hero Image (add at the very top, after title):**
![Hero Image: {gradient_description} gradient with {pattern} pattern overlay. Dimensions: 1200x630px. Alt text: {descriptive_alt_text}](hero-image-placeholder.png)

**Mermaid Diagrams:**
- Keep all Mermaid diagrams as \`\`\`mermaid code blocks (they can be rendered via mermaid.live)
- Add a brief text description before each diagram

**Formatting:**
- Use pull quotes (> blockquotes) for key insights
- Keep paragraphs short (2-3 sentences)
- Use bold for emphasis on key terms
- Add a "TL;DR" or key takeaways section if article is long

**Tags (add at the end):**
**Tags:** Tag1, Tag2, Tag3, Tag4, Tag5`;

const LINKEDIN_SYSTEM_PROMPT = `You are formatting an article for LinkedIn. LinkedIn-specific requirements:
- Start with an attention-grabbing first line (the hook that appears in feed)
- Keep total length under 3000 characters (this is critical!)
- Use short paragraphs (1-2 sentences)
- Add line breaks between paragraphs for mobile readability
- Remove all Mermaid diagrams (LinkedIn doesn't support them)
- Use bullet points and numbered lists for visual structure
- Include 3-5 relevant hashtags at the end
- End with a question or call-to-action to encourage engagement
- Avoid jargon, write conversationally
- Focus on the most impactful insights from the full article`;

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

  // Generate Next.js-compatible blog metadata file
  await generateBlogMetadata(generatedArticles, articlesOutputDir);

  return { articles: generatedArticles, outputPath: articlesOutputDir };
}

/**
 * Generates a TypeScript file that can be used directly in Next.js projects
 * for blog listing pages, similar to lib/blog.ts in the StartupVision site.
 */
async function generateBlogMetadata(
  articles: GeneratedArticle[],
  outputDir: string
): Promise<void> {
  const blogPosts = articles.map((article) => ({
    slug: article.slug,
    title: article.title,
    subtitle: article.subtitle,
    category: article.category,
    readTime: article.readTime,
    gradient: article.gradient,
    pattern: article.pattern,
    tags: article.tags,
    publishedAt: article.generatedAt.split("T")[0], // YYYY-MM-DD format
  }));

  const tsContent = `// Auto-generated by blog-builder
// Copy this file to your Next.js project's lib/ directory

export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  readTime: string;
  gradient: string;
  pattern: "dots" | "grid" | "waves" | "circuit";
  tags: string[];
  publishedAt: string;
}

export const blogPosts: BlogPost[] = ${JSON.stringify(blogPosts, null, 2)};

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}

export function getAllBlogSlugs(): string[] {
  return blogPosts.map((post) => post.slug);
}

export function getBlogPostsByCategory(category: string): BlogPost[] {
  return blogPosts.filter((post) => post.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(blogPosts.map((post) => post.category))];
}
`;

  await writeMarkdown(path.join(outputDir, "blog.ts"), tsContent);

  // Also generate a README with integration instructions
  const readmeContent = `# Generated Blog Content

This directory contains blog articles generated by blog-builder.

## File Structure

Each article folder contains:
- \`article.md\` - Full-length markdown article with Mermaid diagrams
- \`medium.md\` - Medium-optimized version with hero image specification
- \`linkedin.md\` - LinkedIn-optimized version (under 3000 characters)
- \`metadata.json\` - Article metadata (title, tags, etc.)

## Integration with Next.js

### 1. Copy the blog metadata file
\`\`\`bash
cp blog.ts your-nextjs-project/lib/blog.ts
\`\`\`

### 2. Create blog components
Copy the Mermaid and BlogHero components from the StartupVision project or use the examples below.

### 3. Create individual article pages
For each article, create \`app/blog/[slug]/page.tsx\` using the article.md content.

## Mermaid Diagrams

Articles include Mermaid code blocks that can be:
1. Rendered client-side using the mermaid npm package
2. Pre-rendered to SVG using mermaid-cli
3. Rendered via mermaid.live for static sites

## Hero Images

The Medium versions include hero image specifications with:
- Gradient colors (Tailwind CSS format)
- Pattern overlay type
- Recommended dimensions (1200x630px)

Generate actual images using these specifications with tools like:
- Figma/Canva with gradient backgrounds
- CSS-to-image services
- AI image generation with gradient prompts
`;

  await writeMarkdown(path.join(outputDir, "README.md"), readmeContent);
}

async function generateSingleArticle(
  brief: ArticleBrief,
  analysis: SiteAnalysis,
  config: Config
): Promise<GeneratedArticle> {
  // Build the prompt for article generation
  const articlePrompt = buildArticlePrompt(brief, analysis);

  // Generate main article with Mermaid diagrams
  const content = await generateWithClaude(
    config,
    ARTICLE_SYSTEM_PROMPT,
    articlePrompt,
    { maxTokens: 4096, temperature: 0.7 }
  );

  // Extract Mermaid diagrams from content
  const mermaidDiagrams = extractMermaidDiagrams(content);

  // Generate platform-specific versions
  let mediumContent: string | undefined;
  let linkedinContent: string | undefined;

  if (brief.platform === "medium" || brief.platform === "both") {
    const mediumPrompt = `Format this article for Medium publication.

**Use this hero image specification:**
Gradient: ${brief.gradient} (${getGradientDescription(brief.gradient)})
Pattern: ${brief.pattern} pattern overlay
Article title for alt text: ${brief.title}

**Article to format:**

${content}`;

    mediumContent = await generateWithClaude(
      config,
      MEDIUM_SYSTEM_PROMPT,
      mediumPrompt,
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
    slug: brief.slug,
    title: brief.title,
    subtitle: brief.subtitle,
    category: brief.category,
    content,
    excerpt,
    metaDescription,
    tags: brief.keywords,
    mediumContent,
    linkedinContent,
    generatedAt: new Date().toISOString(),
    gradient: brief.gradient,
    pattern: brief.pattern,
    readTime: brief.readTime,
    mermaidDiagrams,
  };
}

function extractMermaidDiagrams(content: string): { id: string; description: string; code: string }[] {
  const diagrams: { id: string; description: string; code: string }[] = [];
  const mermaidRegex = /```mermaid\n([\s\S]*?)```/g;
  let match;
  let index = 0;

  while ((match = mermaidRegex.exec(content)) !== null) {
    diagrams.push({
      id: `diagram-${index++}`,
      description: `Diagram ${index}`,
      code: match[1].trim(),
    });
  }

  return diagrams;
}

function getGradientDescription(gradient: string): string {
  const descriptions: Record<string, string> = {
    blue: "blue-600 to indigo-800",
    purple: "purple-600 to indigo-800",
    green: "emerald-600 to teal-700",
    orange: "orange-500 to red-700",
    teal: "teal-600 to cyan-800",
    slate: "slate-700 to zinc-900",
    rose: "rose-500 to pink-600",
    amber: "amber-500 to orange-600",
    indigo: "indigo-600 to violet-800",
    cyan: "cyan-500 to emerald-700",
  };
  return descriptions[gradient] || gradient;
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
