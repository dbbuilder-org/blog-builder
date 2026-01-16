# Blog Builder - Roadmap

## Vision

Blog Builder becomes the go-to tool for content teams and solopreneurs to maintain consistent, high-quality blog presence across multiple platforms with minimal effort.

---

## Release Timeline

### v0.1.0 - Foundation (Current Sprint)

**Goal**: Working CLI that can analyze a site and generate blog-plan.md

```
┌─────────────────────────────────────────────────────────────────┐
│  v0.1.0 Scope                                                   │
├─────────────────────────────────────────────────────────────────┤
│  ✓ Project setup (TypeScript, CLI framework)                   │
│  ✓ URL fetching with retry logic                               │
│  ✓ HTML content extraction                                     │
│  ✓ Brand voice analysis via Claude                             │
│  ✓ blog-plan.md generation                                     │
│  ✓ Basic output directory structure                            │
└─────────────────────────────────────────────────────────────────┘
```

**Deliverables**:
- `npx blog-builder analyze <url>` works end-to-end
- Generates comprehensive blog-plan.md
- Extracts brand voice and target audience

---

### v0.2.0 - Blog Discovery

**Goal**: Discover and catalog existing blog content

```
┌─────────────────────────────────────────────────────────────────┐
│  v0.2.0 Scope                                                   │
├─────────────────────────────────────────────────────────────────┤
│  ○ Blog section detection                                       │
│  ○ Article listing crawling                                     │
│  ○ Individual article fetching                                  │
│  ○ Content categorization                                       │
│  ○ existing-articles.json output                                │
└─────────────────────────────────────────────────────────────────┘
```

**Deliverables**:
- `npx blog-builder discover <url>` finds all blog posts
- Articles saved with metadata (title, date, topics)
- Blog inventory integrated into blog-plan.md

---

### v0.3.0 - Content Planning

**Goal**: Generate strategic article recommendations

```
┌─────────────────────────────────────────────────────────────────┐
│  v0.3.0 Scope                                                   │
├─────────────────────────────────────────────────────────────────┤
│  ○ Gap analysis between existing and potential content          │
│  ○ Article brief generation                                     │
│  ○ Platform targeting (Medium vs LinkedIn)                      │
│  ○ Content calendar suggestions                                 │
│  ○ Interactive plan approval                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Deliverables**:
- `npx blog-builder plan <url>` generates article briefs
- article-plan.json with editable briefs
- Priority-ranked content opportunities

---

### v0.4.0 - Article Generation

**Goal**: Generate full articles from briefs

```
┌─────────────────────────────────────────────────────────────────┐
│  v0.4.0 Scope                                                   │
├─────────────────────────────────────────────────────────────────┤
│  ○ Article content generation                                   │
│  ○ Brand voice application                                      │
│  ○ Standard Markdown output                                     │
│  ○ Meta description generation                                  │
│  ○ Excerpt/summary creation                                     │
└─────────────────────────────────────────────────────────────────┘
```

**Deliverables**:
- `npx blog-builder generate <url>` creates articles
- Full articles in Markdown format
- Consistent brand voice across all content

---

### v0.5.0 - Platform Optimization

**Goal**: Medium and LinkedIn-ready output

```
┌─────────────────────────────────────────────────────────────────┐
│  v0.5.0 Scope                                                   │
├─────────────────────────────────────────────────────────────────┤
│  ○ Medium formatting (headings, quotes, tags)                   │
│  ○ LinkedIn formatting (hooks, hashtags, CTAs)                  │
│  ○ Platform-specific file outputs                               │
│  ○ Image placeholder suggestions                                │
└─────────────────────────────────────────────────────────────────┘
```

**Deliverables**:
- Three output formats per article (md, medium.md, linkedin.md)
- Platform-appropriate tag/hashtag suggestions
- Copy-paste ready content

---

### v1.0.0 - Production Ready

**Goal**: Polished, reliable tool for daily use

```
┌─────────────────────────────────────────────────────────────────┐
│  v1.0.0 Scope                                                   │
├─────────────────────────────────────────────────────────────────┤
│  ○ Full `run` command (analyze → discover → plan → generate)   │
│  ○ Resume interrupted generation                                │
│  ○ Configuration file support                                   │
│  ○ Comprehensive documentation                                  │
│  ○ Error handling and recovery                                  │
│  ○ npm package publication                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Deliverables**:
- `npx blog-builder run <url>` full pipeline
- Published to npm as `blog-builder`
- Complete documentation and examples

---

## Future Releases

### v1.1.0 - SEO Enhancement

- Keyword research integration
- SEO scoring for generated content
- Internal linking suggestions
- Schema markup recommendations

### v1.2.0 - Publishing Integration

- WordPress REST API publishing
- Ghost CMS integration
- Draft management
- Scheduled publishing

### v1.3.0 - Intelligence

- Competitor content analysis
- Trending topic detection
- Content performance tracking
- A/B headline testing suggestions

### v1.4.0 - Team Features

- Multi-user configuration
- Content approval workflows
- Brand voice version control
- Collaborative editing support

### v2.0.0 - Platform

- Web dashboard
- Content calendar UI
- Analytics integration
- API for third-party tools

---

## Success Metrics

| Metric | v0.5 Target | v1.0 Target |
|--------|-------------|-------------|
| Sites successfully analyzed | 90% | 95% |
| Articles requiring no edits | 50% | 70% |
| User satisfaction (1-5) | 3.5 | 4.0 |
| Time to 10 articles | < 10 min | < 5 min |
| npm weekly downloads | 100 | 1,000 |

---

## Technical Debt Priorities

1. **Testing**: Add comprehensive test suite before v1.0
2. **Caching**: Implement content caching for repeated runs
3. **Error Recovery**: Graceful handling of all failure modes
4. **Performance**: Optimize API calls and parallel processing

---

## Dependencies on External Factors

- **Claude API**: Core dependency for all AI features
- **Site Accessibility**: Public sites only (no auth support initially)
- **Platform APIs**: Medium/LinkedIn may change policies
- **Rate Limits**: Must stay within Anthropic's limits

---

## Open Questions

1. Should we support authentication for private sites?
2. Image generation: DALL-E integration worth the complexity?
3. Pricing model if this becomes a SaaS?
4. Multi-language: When to prioritize?

---

## Changelog

| Date | Version | Notes |
|------|---------|-------|
| 2026-01-16 | v0.0.1 | Project initialized |
