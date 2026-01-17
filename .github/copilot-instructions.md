# Noctua AI Coding Instructions

## Architecture Overview

Noctua is an AI-powered RSS feed aggregator that processes feeds through a 4-step pipeline:

1. **Download** (Python): Fetches RSS/Atom feeds concurrently using httpx + feedparser
2. **Filter** (Python): Applies keyword/age/content filters, removes duplicates
3. **Summarize** (Node.js): Uses Gemini API to generate section and overall summaries
4. **Build Website** (Astro): Generates static site with Svelte components

**Key Data Flow**: `config.yaml` → `output/download.json` → `output/filter.json` → `output/summarize.json` → `output/app/`

## Critical Workflows

### Full Pipeline Execution

```bash
npm run workflow:all  # Downloads → Filters → Summarizes → Builds website
```

### Individual Steps

```bash
# Python steps (use uv for dependency management)
uv sync                    # Install Python deps
uv run python -m workflow.download.main
uv run python -m workflow.filter.main

# Node.js summarization
npm run summarize         # Requires GEMINI_API_KEY env var

# Website build
cd app && npm run build   # Outputs to ../output/app/
```

### Development

```bash
npm run install:all       # Install all dependencies (root + workspaces)
cd app && npm run dev     # Start dev server on localhost:4321
```

## Project Conventions

### Configuration Hierarchy

Filters cascade from global → section → feed level in `config.yaml`:

```yaml
settings:
  filter:
    max_age_hours: 72
sections:
  technology:
    filter:
      max_age_hours: 48 # Overrides global
      feeds:
        - name: "Hacker News"
          filter:
            max_age_hours: 12 # Feed-specific override
```

### Data Models

Use Pydantic models in `workflow/common/models.py`:

- `Article`: Individual feed entries with filtering flags
- `Feed`: RSS source with fetch status
- `Section`: Grouped feeds with AI summary
- `FeedData`: Container with processing metadata

### Error Handling

- Python: Rich console for colored output, exceptions caught per feed/article
- Node.js: Graceful API failure fallbacks, chalk for terminal colors
- Website: Client-side storage with fallbacks

### AI Summarization Patterns

- Section summaries: Top N recent articles per section
- Overall summary: Cross-section analysis
- Prompts specify output language and bold-only markdown
- Fallback to cached summaries when API unavailable

### Frontend Patterns

- Svelte components with TypeScript interfaces
- Tailwind CSS with semantic class names (`card`, `card-body`)
- Local storage for read tracking and preferences
- Responsive design with compact/full views

## Integration Points

### External Dependencies

- **Gemini API**: Requires `GEMINI_API_KEY`, models like `gemini-1.5-flash`
- **RSS Feeds**: feedparser handles Atom/RSS variants, BeautifulSoup cleans HTML
- **Static Hosting**: Astro generates to `output/app/` for GitHub Pages

### File Structure Conventions

- `workflow/common/`: Shared Python utilities (config, IO, models)
- `output/`: Generated artifacts (gitignored JSON + built site)
- `app/src/lib/`: Astro data loaders and utilities
- Config loaded at runtime, not bundled

### Build & Deploy

- Docker: `docker build -t noctua .` runs full pipeline
- GitHub Actions: Automated daily builds with API key secrets
- Base URL configurable for GitHub Pages deployment

## Common Patterns

### Python Workflow Steps

```python
from workflow.common import load_config, load_step_output, save_step_output

config = load_config()  # From config.yaml
data = load_step_output(step="download", model_class=FeedData)
# ... process data ...
save_step_output(data, step="filter")
```

### Node.js Data Loading

```javascript
// Load with fallbacks: summarize → filter → download
const data = loadInputData(); // Handles missing files gracefully
```

### Svelte Component Props

```svelte
<script lang="ts">
  interface Props {
    article: Article;
    isRead: boolean;
    onArticleClick: () => void;
  }
  let { article, isRead, onArticleClick }: Props = $props();
</script>
```

### Astro Data Loading

````typescript
// data.ts loads JSON with filesystem fallbacks
export async function loadData(): Promise<FeedData> {
  for (const path of FALLBACK_PATHS) {
    if (existsSync(join(PROJECT_ROOT, path))) {
      return JSON.parse(readFileSync(join(PROJECT_ROOT, path), 'utf-8'));
    }
  }
  throw new Error('No feed data found');
}
```</content>
<parameter name="filePath">/home/jannis/dev/noctua/.github/copilot-instructions.md
````
