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
  title: string;
  topic: string;
  angle: string;
  targetAudience: string;
  keywords: string[];
  outline: string[];
  targetLength: number;
  platform: "medium" | "linkedin" | "both";
  status: "planned" | "approved" | "generated";
}

export interface GeneratedArticle {
  briefId: string;
  title: string;
  content: string;
  excerpt: string;
  metaDescription: string;
  tags: string[];
  mediumContent?: string;
  linkedinContent?: string;
  generatedAt: string;
}

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
