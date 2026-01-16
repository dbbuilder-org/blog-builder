export interface Config {
  outputDir: string;
  articleCount: number;
  topics?: string[];
  verbose: boolean;
  rateLimit: number;
  anthropicApiKey: string;
}

export interface SiteAnalysis {
  url: string;
  domain: string;
  name: string;
  description: string;
  industry: string;
  targetAudience: string[];
  valuePropositions: string[];
  keyTopics: string[];
  brandVoice: BrandVoice;
  analyzedAt: string;
}

export interface BrandVoice {
  tone: "professional" | "casual" | "technical" | "friendly" | "authoritative";
  formality: "formal" | "semi-formal" | "informal";
  vocabulary: string[];
  sentenceStyle: string;
  avoidWords: string[];
  examplePhrases: string[];
}

export interface ExistingArticle {
  url: string;
  title: string;
  publishedAt?: string;
  excerpt: string;
  topics: string[];
  wordCount: number;
  content?: string;
}

export interface ContentGap {
  topic: string;
  priority: "high" | "medium" | "low";
  rationale: string;
  suggestedAngles: string[];
}

export interface ArticleBrief {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  topic: string;
  angle: string;
  category: string;
  targetAudience: string;
  keywords: string[];
  outline: string[];
  targetLength: number;
  platform: "medium" | "linkedin" | "both";
  status: "planned" | "approved" | "generated";
  // Visual theming for hero images
  gradient: string;
  pattern: "dots" | "grid" | "waves" | "circuit";
  readTime: string;
}

export interface GeneratedArticle {
  briefId: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  tags: string[];
  mediumContent?: string;
  linkedinContent?: string;
  generatedAt: string;
  // Visual theming
  gradient: string;
  pattern: "dots" | "grid" | "waves" | "circuit";
  readTime: string;
  // Mermaid diagrams used in this article
  mermaidDiagrams?: MermaidDiagram[];
}

export interface MermaidDiagram {
  id: string;
  description: string;
  code: string;
}

// Gradient presets for consistent theming
export const GRADIENT_PRESETS = {
  blue: "from-blue-600 via-blue-700 to-indigo-800",
  purple: "from-purple-600 via-purple-700 to-indigo-800",
  green: "from-emerald-600 via-teal-700 to-cyan-800",
  orange: "from-orange-500 via-red-600 to-rose-700",
  teal: "from-teal-600 via-cyan-700 to-blue-800",
  slate: "from-slate-700 via-slate-800 to-zinc-900",
  rose: "from-rose-500 via-pink-600 to-purple-700",
  amber: "from-amber-500 via-orange-600 to-red-700",
  indigo: "from-indigo-600 via-violet-700 to-purple-800",
  cyan: "from-cyan-500 via-teal-600 to-emerald-700",
} as const;

export type GradientKey = keyof typeof GRADIENT_PRESETS;

export interface AnalyzeResult {
  analysis: SiteAnalysis;
  planPath: string;
}

export interface DiscoverResult {
  articles: ExistingArticle[];
  inventoryPath: string;
}

export interface PlanResult {
  articles: ArticleBrief[];
  gaps: ContentGap[];
  planPath: string;
}

export interface GenerateResult {
  articles: GeneratedArticle[];
  outputPath: string;
}
