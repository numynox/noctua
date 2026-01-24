/**
 * Data loader for Astro pages
 * Loads articles from filter/download step and summaries from summarize step
 */

import { existsSync, readFileSync } from "fs";
import { load } from "js-yaml";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");

// Define fallback paths for article data (in order of preference)
const ARTICLE_FALLBACK_PATHS = ["output/filter.json", "output/download.json"];

// Path for summary data (optional)
const SUMMARY_PATH = "output/summarize.json";

/**
 * Load configuration from config.yaml
 */
export function loadConfig() {
  const configPath = join(PROJECT_ROOT, "config.yaml");
  if (existsSync(configPath)) {
    const configData = readFileSync(configPath, "utf-8");
    return load(configData) as any;
  }
  return {};
}

/**
 * Get the base URL from configuration
 */
export function getBaseUrl(): string {
  const config = loadConfig();
  return config.settings?.website?.base_url || "/";
}

export interface Article {
  id: string;
  title: string;
  url: string;
  published: string | null;
  updated: string | null;
  author: string | null;
  summary: string | null;
  image_url: string | null;
  feed_name: string;
  section_id: string;
  tags: string[];
}

export interface Feed {
  id: string;
  name: string;
  url: string;
  section_id: string;
  title: string | null;
  description: string | null;
  link: string | null;
  last_updated: string | null;
  articles: Article[];
  fetch_status: string;
  fetch_error: string | null;
  fetched_at: string | null;
}

export interface Section {
  id: string;
  name: string;
  description: string;
  icon: string;
  feeds: Feed[];
  ai_summary: string | null;
}

export interface FeedData {
  sections: Section[];
  processed_at: string;
  overall_summary: string | null;
}

export interface SectionSummary {
  section_id: string;
  ai_summary: string | null;
}

export interface SummaryData {
  section_summaries: SectionSummary[];
  overall_summary: string | null;
  processed_at: string;
}

/**
 * Load summary data from disk (optional)
 */
function loadSummaryData(): SummaryData | null {
  const fullPath = join(PROJECT_ROOT, SUMMARY_PATH);
  if (existsSync(fullPath)) {
    try {
      console.log(`Loading summaries from: ${fullPath}`);
      const rawData = readFileSync(fullPath, "utf-8");
      return JSON.parse(rawData) as SummaryData;
    } catch (error) {
      console.warn(`Failed to load summaries from ${fullPath}:`, error);
      return null;
    }
  }
  console.log(`No summaries found at ${fullPath}`);
  return null;
}

/**
 * Load feed data from disk with fallback paths
 */
export function loadFeedData(): FeedData {
  // Try article paths in order (filter.json or download.json)
  let articleData: FeedData | null = null;
  for (const relativePath of ARTICLE_FALLBACK_PATHS) {
    const fullPath = join(PROJECT_ROOT, relativePath);
    if (existsSync(fullPath)) {
      console.log(`Loading articles from: ${fullPath}`);
      const rawData = readFileSync(fullPath, "utf-8");
      articleData = JSON.parse(rawData) as FeedData;
      break;
    }
  }

  if (!articleData) {
    console.warn(
      `No article data found in any of the fallback paths, using empty data`,
    );
    articleData = {
      sections: [],
      processed_at: new Date().toISOString(),
      overall_summary: null,
    };
  }

  // Load summaries separately (optional)
  const summaryData = loadSummaryData();

  // Merge summaries into article data if available
  if (summaryData) {
    // Set overall summary
    articleData.overall_summary = summaryData.overall_summary;

    // Set section summaries
    for (const section of articleData.sections) {
      const sectionSummary = summaryData.section_summaries.find(
        (s) => s.section_id === section.id,
      );
      if (sectionSummary) {
        section.ai_summary = sectionSummary.ai_summary;
      }
    }
  }

  return articleData;
}

/**
 * Get all articles sorted by date
 */
export function getAllArticles(data: FeedData): Article[] {
  return data.sections
    .flatMap((s) => s.feeds.flatMap((f) => f.articles))
    .sort(
      (a, b) =>
        new Date(b.published || 0).getTime() -
        new Date(a.published || 0).getTime(),
    );
}

/**
 * Get articles for a specific section
 */
export function getSectionArticles(
  data: FeedData,
  sectionId: string,
): Article[] {
  const section = data.sections.find((s) => s.id === sectionId);
  if (!section) return [];

  return section.feeds
    .flatMap((f) => f.articles)
    .sort(
      (a, b) =>
        new Date(b.published || 0).getTime() -
        new Date(a.published || 0).getTime(),
    );
}
