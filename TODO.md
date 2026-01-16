# Blog Builder - TODO

## Phase 1: Foundation (Current)

### Project Setup
- [x] Create project structure
- [x] Write README.md
- [x] Write REQUIREMENTS.md
- [x] Write TODO.md
- [x] Write ROADMAP.md
- [ ] Initialize npm project
- [ ] Configure TypeScript
- [ ] Set up ESLint + Prettier
- [ ] Create .env.example
- [ ] Add .gitignore
- [ ] Create GitHub repo

### Core Infrastructure
- [ ] Set up CLI with Commander.js
- [ ] Configure Anthropic SDK
- [ ] Create storage utilities (file I/O)
- [ ] Add progress indicators (ora)
- [ ] Add colored output (chalk)
- [ ] Create logging system

---

## Phase 2: Site Analysis

### URL Fetching
- [ ] Implement URL validator
- [ ] Create fetch wrapper with retry logic
- [ ] Add robots.txt checking
- [ ] Implement rate limiting
- [ ] Handle redirects properly

### Content Extraction
- [ ] Parse HTML with Cheerio
- [ ] Remove navigation/footer/sidebar content
- [ ] Extract main content area
- [ ] Handle common page structures
- [ ] Support meta tag extraction

### JavaScript Rendering (Optional)
- [ ] Add Playwright integration
- [ ] Detect JS-heavy sites
- [ ] Render and extract dynamic content
- [ ] Screenshot for debugging

---

## Phase 3: Brand Voice Analysis

### Voice Extraction
- [ ] Create brand voice extraction prompt
- [ ] Analyze writing tone
- [ ] Detect formality level
- [ ] Extract industry vocabulary
- [ ] Identify sentence patterns
- [ ] Generate style guide

### Site Context
- [ ] Extract value propositions
- [ ] Identify target audience
- [ ] Detect key topics/themes
- [ ] Analyze service/product offerings

---

## Phase 4: Blog Discovery

### Article Detection
- [ ] Find blog/news links in navigation
- [ ] Detect common blog URL patterns (/blog, /news, /articles)
- [ ] Handle paginated listing pages
- [ ] Extract article links from listings

### Article Analysis
- [ ] Fetch individual articles
- [ ] Extract title, date, content
- [ ] Calculate word count
- [ ] Identify article topics
- [ ] Store as JSON inventory

---

## Phase 5: Content Planning

### Gap Analysis
- [ ] Compare existing content vs site offerings
- [ ] Identify missing topic coverage
- [ ] Prioritize by business impact
- [ ] Generate opportunity list

### Article Planning
- [ ] Create article brief template
- [ ] Generate recommended articles
- [ ] Assign platform targets
- [ ] Create content calendar
- [ ] Allow interactive plan editing

---

## Phase 6: Article Generation

### Content Writing
- [ ] Create article generation prompt
- [ ] Apply brand voice consistently
- [ ] Generate proper structure (intro, body, conclusion)
- [ ] Include actionable takeaways
- [ ] Target specified word count

### Quality Control
- [ ] Validate Markdown output
- [ ] Check for placeholder text
- [ ] Ensure uniqueness between articles
- [ ] Generate meta descriptions

---

## Phase 7: Platform Formatting

### Medium Format
- [ ] Apply Medium heading conventions
- [ ] Add pull quotes for key insights
- [ ] Include image placeholders
- [ ] Generate tag suggestions
- [ ] Format code blocks properly

### LinkedIn Format
- [ ] Create attention-grabbing hook
- [ ] Shorten paragraphs
- [ ] Add strategic line breaks
- [ ] Generate hashtag suggestions
- [ ] Include call-to-action
- [ ] Respect character limits

---

## Phase 8: Output & Polish

### File Management
- [ ] Create organized output structure
- [ ] Generate blog-plan.md summary
- [ ] Save all JSON data files
- [ ] Create article folders with all formats

### CLI Polish
- [ ] Add comprehensive --help
- [ ] Implement all command options
- [ ] Add interactive mode
- [ ] Create resume functionality
- [ ] Add verbose/quiet modes

### Documentation
- [ ] Update README with examples
- [ ] Add troubleshooting guide
- [ ] Create example outputs
- [ ] Document configuration options

---

## Backlog (Future)

### Integrations
- [ ] WordPress publishing API
- [ ] Ghost publishing API
- [ ] Medium API (if available)
- [ ] LinkedIn API posting

### Enhancements
- [ ] SEO scoring for articles
- [ ] Competitor analysis
- [ ] Image generation suggestions
- [ ] Content performance tracking
- [ ] Multi-language support

### Developer Experience
- [ ] Add unit tests
- [ ] Add integration tests
- [ ] Set up CI/CD
- [ ] Publish to npm
- [ ] Create VS Code extension

---

## Bug Fixes

_None yet - project in development_

---

## Notes

- Keep API costs in mind - batch similar operations
- Test with various site types (SaaS, agency, e-commerce)
- Consider caching for repeated runs on same site
