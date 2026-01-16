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
        `⚠ Filter output not found, using download output: ${DOWNLOAD_INPUT_PATH}`
      )
    );
    return JSON.parse(readFileSync(DOWNLOAD_INPUT_PATH, "utf-8"));
  }

  // Neither exists
  throw new Error(
    `No input data found. Please run download step first.\n` +
      `  Tried: ${FILTER_INPUT_PATH}\n` +
      `  Tried: ${DOWNLOAD_INPUT_PATH}`
  );
}

/**
 * Check if output already exists (skip regeneration if requested)
 */
function outputExists() {
  return existsSync(OUTPUT_PATH);
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
    return `[AI summary unavailable - no API key]`;
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
      `  → Summarizing section: ${section.name} (${topArticles.length} articles)`
    )
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
        }`
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
      `  → Generating overall summary (${allArticles.length} articles)...`
    )
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
        }`
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

  // Check if --skip-if-exists flag is provided
  const skipIfExists = process.argv.includes("--skip-if-exists");

  if (skipIfExists && outputExists()) {
    console.log(
      chalk.yellow("⚠ Output already exists, skipping summarization")
    );
    console.log(chalk.dim(`  Output: ${OUTPUT_PATH}`));
    return;
  }

  // Load config and data
  const config = loadConfig();
  const data = loadInputData();

  console.log(
    chalk.dim(
      `Loaded ${data.sections.reduce(
        (sum, s) =>
          sum + s.feeds.reduce((fsum, f) => fsum + f.articles.length, 0),
        0
      )} articles\n`
    )
  );

  let apiCallCount = 0;

  // Process each section
  for (const section of data.sections) {
    console.log(chalk.bold(`\n${section.icon} ${section.name}`));

    // Generate ONE section summary (analyzing N most recent articles)
    try {
      section.ai_summary = await summarizeSection(section, config);
      apiCallCount++;
    } catch (error) {
      console.log(
        chalk.red(`  ✗ Failed to summarize section: ${error.message}`)
      );
    }
  }

  // Generate overall summary
  console.log(chalk.bold("\n📊 Overall Summary"));
  try {
    data.overall_summary = await summarizeOverall(data, config);
    apiCallCount++;
  } catch (error) {
    console.log(
      chalk.red(`  ✗ Failed to generate overall summary: ${error.message}`)
    );
  }

  // Update metadata
  data.processed_at = new Date().toISOString();
  data.step = "summarize";

  // Save output
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));

  // Print summary
  console.log(chalk.green.bold("\n✓ Summarization complete"));
  console.log(`  API calls made: ${apiCallCount}`);
  console.log(`  Output: ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(chalk.red(`\nError: ${error.message}`));
  process.exit(1);
});
