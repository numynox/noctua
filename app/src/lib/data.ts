/**
 * Data loader for Astro pages
 * Loads articles from filter/download step
 */

import { existsSync, readFileSync } from "fs";
import { load } from "js-yaml";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");

// Define fallback paths for article data (in order of preference)
const ARTICLE_FALLBACK_PATHS = ["output/filter.json", "output/download.json"];

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
}

export interface FeedData {
  sections: Section[];
  processed_at: string;
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
    };
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
