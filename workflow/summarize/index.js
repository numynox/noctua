/**
 * AI Summarization using Gemini API
 *
 * This module uses the Gemini API to generate summaries for sections
 * and an overall digest. Individual articles use RSS feed summaries.
 *
 * Input: output/filter.json
 * Output: output/summarize.json
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import chalk from "chalk";
import dotenv from "dotenv";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import yaml from "js-yaml";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, "..", "..");

// Load .env from project root
dotenv.config({ path: join(PROJECT_ROOT, ".env") });

// Configuration
const CONFIG_PATH = join(PROJECT_ROOT, "config.yaml");
const OUTPUT_DIR =
  process.env.NOCTUA_OUTPUT_DIR || join(PROJECT_ROOT, "output");
const FILTER_INPUT_PATH = join(OUTPUT_DIR, "filter.json");
const DOWNLOAD_INPUT_PATH = join(OUTPUT_DIR, "download.json");
const OUTPUT_PATH = join(OUTPUT_DIR, "summarize.json");

/**
 * Load configuration file
 */
function loadConfig() {
  const configContent = readFileSync(CONFIG_PATH, "utf-8");
  return yaml.load(configContent);
}

/**
 * Load input data with fallback to download step if filter doesn't exist
 */
function loadInputData() {
  // Try filter output first
  if (existsSync(FILTER_INPUT_PATH)) {
    console.log(chalk.dim(`Loading from filter step: ${FILTER_INPUT_PATH}`));
    return JSON.parse(readFileSync(FILTER_INPUT_PATH, "utf-8"));
  }

  // Fall back to download output
  if (existsSync(DOWNLOAD_INPUT_PATH)) {
    console.log(
      chalk.yellow(
        `⚠ Filter output not found, using download output: ${DOWNLOAD_INPUT_PATH}`,
      ),
    );
    return JSON.parse(readFileSync(DOWNLOAD_INPUT_PATH, "utf-8"));
  }

  // Neither exists
  throw new Error(
    `No input data found. Please run download step first.\n` +
      `  Tried: ${FILTER_INPUT_PATH}\n` +
      `  Tried: ${DOWNLOAD_INPUT_PATH}`,
  );
}

/**
 * Check if cached summary is still valid based on cache_expiration_time
 */
function isCacheValid(config) {
  if (!existsSync(OUTPUT_PATH)) {
    return false;
  }

  try {
    const summaryData = JSON.parse(readFileSync(OUTPUT_PATH, "utf-8"));
    const processedAt = new Date(summaryData.processed_at);
    const now = new Date();
    const hoursSinceProcessed =
      (now.getTime() - processedAt.getTime()) / (1000 * 60 * 60);

    const cacheExpirationTime =
      config.summarization?.cache_expiration_time || 24;

    return hoursSinceProcessed < cacheExpirationTime;
  } catch (error) {
    console.log(chalk.dim(`  Cache check failed: ${error.message}`));
    return false;
  }
}

/**
 * Initialize Gemini AI client
 */
function initGemini() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn(chalk.yellow(`  ⚠ No API key found`));
    return null;
  }

  return new GoogleGenerativeAI(apiKey);
}

/**
 * Call Gemini API to generate a summary
 * Using the official Google Generative AI SDK
 */
async function callGemini(prompt, content, model = "gemini-1.5-flash") {
  const fullPrompt = `${prompt}\n\n---\n\n${content}`;

  const genAI = initGemini();
  if (!genAI) {
    throw new Error("No API key available");
  }

  try {
    const geminiModel = genAI.getGenerativeModel({
      model,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const result = await geminiModel.generateContent(fullPrompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error("No text in response");
    }

    return text.trim();
  } catch (error) {
    console.error(chalk.red(`  ✗ API call failed: ${error.message}`));
    return `[Summary generation failed: ${error.message}]`;
  }
}

/**
 * Summarize a section
 */
async function summarizeSection(section, config) {
  // Get the N most recent articles across all feeds in this section
  const topArticles = section.feeds
    .flatMap((f) => f.articles)
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .slice(0, config.summarization.articles_per_section_summary || 20);

  if (topArticles.length === 0) {
    return null;
  }

  console.log(
    chalk.cyan(
      `  → Summarizing section: ${section.name} (${topArticles.length} articles)`,
    ),
  );

  const prompt =
    config.summarization.prompts.section +
    `\n\nOutput language: ${config.summarization.output_language || "English"}. The entire summary must be written in this language.` +
    "\n\nIMPORTANT: Use ONLY bold text (**keyword**) for markdown formatting. All other text must be plain text. Highlight the most important keywords and phrases in bold.";

  // Build comprehensive content with titles and summaries
  const content = topArticles
    .map(
      (a, i) =>
        `${i + 1}. ${a.title}\n   Source: ${a.feed_name}\n   Summary: ${
          a.summary ||
          a.clean_content?.substring(0, 200) ||
          "No summary available"
        }`,
    )
    .join("\n\n");

  const summary = await callGemini(prompt, content, config.summarization.model);

  return summary;
}

/**
 * Generate overall summary (analyzing top articles across all sections)
 */
async function summarizeOverall(data, config) {
  const allArticles = data.sections
    .flatMap((s) => s.feeds.flatMap((f) => f.articles))
    .sort((a, b) => new Date(b.published) - new Date(a.published))
    .slice(0, config.summarization.max_articles_overall || 30);

  if (allArticles.length === 0) {
    return null;
  }

  console.log(
    chalk.cyan(
      `  → Generating overall summary (${allArticles.length} articles)...`,
    ),
  );

  const prompt =
    config.summarization.prompts.overall +
    `\n\nOutput language: ${config.summarization.output_language || "English"}. The entire summary must be written in this language.` +
    "\n\nIMPORTANT: Use ONLY bold text (**keyword**) for markdown formatting. All other text must be plain text. Highlight the most important keywords and phrases in bold.";
  const content = allArticles
    .map(
      (a, i) =>
        `${i + 1}. ${a.title}\n   Source: ${a.feed_name}\n   ${
          a.summary ||
          a.clean_content?.substring(0, 200) ||
          "No summary available"
        }`,
    )
    .join("\n\n");

  const summary = await callGemini(prompt, content, config.summarization.model);

  return summary;
}

/**
 * Main function
 */
async function main() {
  console.log(chalk.bold.blue("\n═══ Noctua: AI Summarization ═══\n"));

  // Load config first
  const config = loadConfig();

  // Check for --ignore-cache flag
  const ignoreCache = process.argv.includes("--ignore-cache");

  // Check if cache is still valid (unless --ignore-cache is specified)
  if (!ignoreCache && isCacheValid(config)) {
    console.log(
      chalk.green("✓ Using cached summaries (still within expiration time)"),
    );
    console.log(
      chalk.dim(
        `  Cache expires after ${config.summarization?.cache_expiration_time || 24} hours`,
      ),
    );
    console.log(
      chalk.dim(`  To ignore cache, use: npm run summarize -- --ignore-cache`),
    );
    console.log(chalk.dim(`  Output: ${OUTPUT_PATH}`));
    return;
  }

  if (ignoreCache) {
    console.log(chalk.yellow("⚠ Ignoring cache, regenerating summaries"));
  }

  // Check if API key is available
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log(chalk.yellow("⚠ No API key found - skipping summarization"));
    console.log(
      chalk.dim(
        "  To enable AI summaries, set GEMINI_API_KEY environment variable",
      ),
    );
    return;
  }

  // Load data
  const data = loadInputData();

  console.log(
    chalk.dim(
      `Loaded ${data.sections.reduce(
        (sum, s) =>
          sum + s.feeds.reduce((fsum, f) => fsum + f.articles.length, 0),
        0,
      )} articles\n`,
    ),
  );

  let apiCallCount = 0;
  const sectionSummaries = [];

  // Process each section
  for (const section of data.sections) {
    console.log(chalk.bold(`\n${section.icon} ${section.name}`));

    // Generate ONE section summary (analyzing N most recent articles)
    try {
      const aiSummary = await summarizeSection(section, config);
      sectionSummaries.push({
        section_id: section.id,
        ai_summary: aiSummary,
      });
      apiCallCount++;
    } catch (error) {
      console.log(
        chalk.red(`  ✗ Failed to summarize section: ${error.message}`),
      );
      sectionSummaries.push({
        section_id: section.id,
        ai_summary: null,
      });
    }
  }

  // Generate overall summary
  console.log(chalk.bold("\n📊 Overall Summary"));
  let overallSummary = null;
  try {
    overallSummary = await summarizeOverall(data, config);
    apiCallCount++;
  } catch (error) {
    console.log(
      chalk.red(`  ✗ Failed to generate overall summary: ${error.message}`),
    );
  }

  // Create summary-only output (no articles)
  const summaryOutput = {
    section_summaries: sectionSummaries,
    overall_summary: overallSummary,
    processed_at: new Date().toISOString(),
    step: "summarize",
  };

  // Save output
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(summaryOutput, null, 2));

  // Print summary
  console.log(chalk.green.bold("\n✓ Summarization complete"));
  console.log(`  API calls made: ${apiCallCount}`);
  console.log(`  Output: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(chalk.red(`\nError: ${error.message}`));
  process.exit(1);
});
