# 🦉 Noctua

**AI-powered RSS feed aggregator with intelligent summarization**

Noctua is an open-source project that downloads RSS feeds, filters articles based on your preferences, summarizes them using AI (Gemini), and generates a beautiful static website that you can host anywhere.

## ✨ Features

- **📰 RSS Feed Aggregation**: Download and parse feeds from multiple sources, organized into sections
- **🔍 Smart Filtering**: Filter articles by age, keywords, content length, and more
- **🤖 AI Summarization**: Generate concise summaries using Google's Gemini AI
- **🌐 Static Website**: Beautiful, responsive site built with Astro and Tailwind CSS
- **💾 Local Storage**: Track read articles and preferences in browser storage
- **🎨 Theme Support**: Light, dark, and auto themes
- **🚀 GitHub Pages**: One-click deployment with GitHub Actions

## 📁 Project Structure

```
noctua/
├── config.yaml              # Main configuration file
├── workflow/
│   ├── common/              # Shared Python utilities
│   ├── download/            # Download and parse feeds
│   ├── filter/              # Filter and cleanup
│   └── summarize/           # AI summarization (Node.js)
├── app/                     # Astro static website
│   ├── src/
│   ├── public/
│   └── astro.config.mjs
├── output/                  # Generated outputs (git-ignored)
│   ├── download/
│   ├── filter/
│   └── summarize/
├── .github/
│   └── workflows/           # GitHub Actions
├── pyproject.toml           # Python dependencies
└── package.json             # Node.js dependencies
```

## 🚀 Quick Start

### Prerequisites

- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [Node.js](https://nodejs.org/) v20+
- [Gemini API key](https://aistudio.google.com/apikey) (for AI summarization)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/noctua.git
   cd noctua
   ```

2. **Install Python dependencies**

   ```bash
   uv sync
   ```

3. **Install Node.js dependencies**

   ```bash
   npm run install:all
   # Or manually:
   # npm install
   # cd workflow/summarize && npm install && cd ../..
   # cd app && npm install && cd ..
   ```

4. **Set up your Gemini API key**
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```

### Running the Pipeline

Run each step independently:

```bash
# Download feeds
uv run python -m workflow.download.main

# Filter and cleanup
uv run python -m workflow.filter.main

# AI summarization
node workflow/summarize/index.js

# Build website
cd app && npm run build && cd ..
```

Or use npm scripts:

```bash
# Full pipeline
npm run workflow:all

# Individual steps
npm run download
npm run filter
npm run summarize
npm run build:website
```

### Preview the Website

```bash
cd app
npm run dev:website
# Open http://localhost:4321
```

## ⚙️ Configuration

Edit `config.yaml` to customize:

### Adding Feeds

```yaml
sections:
  technology:
    name: "Technology"
    icon: "💻"
    enabled: true
    feeds:
      - name: "Hacker News"
        url: "https://hnrss.org/frontpage"
        enabled: true
      - name: "Your Feed"
        url: "https://example.com/feed.xml"
        enabled: true
```

### Filtering Rules

Filtering can be defined globally, per section, or per feed.

```yaml
settings:
  website:
    article_fetch_limit: 300 # Max articles fetched per section in app UI
  filter:
    max_age_hours: 72 # Exclude old articles
    exclude_keywords: # Block these terms
      - "sponsored"
      - "advertisement"

sections:
  technology:
    filter:
      max_age_hours: 48 # Override global age
      exclude_keywords: ["crypto"]
      feeds:
        - name: "Heise"
          url: "https://www.heise.de/rss/heise-atom.xml"
          enabled: true
          filter:
            max_age_hours: 12 # Override global age
            exclude_keywords: [] # Disable exclude_keywords for this feed
```

### AI Summarization

```yaml
summarization:
  model: "gemini-2.5-flash"
  max_articles_per_section: 10
  max_articles_overall: 20
```

## 🐳 Docker

Build and run with Docker:

```bash
# Build
docker build -t noctua .

# Run all steps
docker run -e GEMINI_API_KEY=$GEMINI_API_KEY -v $(pwd)/output:/app/output noctua
```

## 🚀 GitHub Pages Deployment

1. **Enable GitHub Pages** in your repository settings (Settings → Pages → Source: GitHub Actions)

2. **Add your Gemini API key** as a repository secret:
   - Go to Settings → Secrets and variables → Actions
   - Add `GEMINI_API_KEY` with your API key

3. **Push to main** - the workflow will:
   - Download and filter feeds
   - Generate AI summaries
   - Build and deploy the website

### Workflow Options

- **Full build**: Runs daily at 6 AM UTC with AI summarization
- **Quick update**: Runs every 4 hours without AI (uses cached summaries)

Trigger manually from Actions tab with options:

- Skip summarization (save API tokens)
- Force full rebuild (ignore caches)

## 🔧 Environment Variables

| Variable            | Description            | Required         |
| ------------------- | ---------------------- | ---------------- |
| `GEMINI_API_KEY`    | Google Gemini API key  | For summary      |
| `NOCTUA_ROOT`       | Project root directory | Optional         |
| `NOCTUA_OUTPUT_DIR` | Base output directory  | Optional         |
| `NOCTUA_BASE_URL`   | Website base URL       | For GitHub Pages |

### Supabase frontend configuration

The Astro app in `app/` now reads data directly from Supabase in the browser.

Set these variables in your local `.env` (or shell):

```bash
PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

For local Supabase CLI, `PUBLIC_SUPABASE_URL` is typically:

```bash
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

Apply DB migrations (including the auth profile trigger):

```bash
npx supabase db reset
# or against remote
npx supabase db push
```

Required manual Supabase dashboard setup:

- Enable email/password authentication provider
- Set allowed redirect URLs for local dev and GitHub Pages
- Ensure repository variables `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` are set for GitHub Actions

## 🌐 User Features

The generated website includes:

- **Read tracking**: Articles marked as read are dimmed (stored in browser)
- **Section visibility**: Show/hide entire sections
- **Filtering**: Search and filter by date range
- **Compact view**: Toggle between detailed and compact article cards
- **Theme selection**: Light, dark, or auto (follows system)

All preferences are stored in browser localStorage - each user maintains their own read history.

## 📝 License

AGPL License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions welcome! Please feel free to submit issues and pull requests.

## 🦉 Why "Noctua"?

Noctua is Latin for "owl" - a creature known for wisdom and night vision. Like an owl, this tool helps you see through the noise and find what matters in your news feeds.
