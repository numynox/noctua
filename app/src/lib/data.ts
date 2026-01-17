/**
 * Data loader for Astro pages
 * Loads the processed feed data from summarize step output
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");

// Define fallback paths in order of preference
const FALLBACK_PATHS = [
  "output/summarize.json",
  "output/filter.json",
  "output/download.json",
];

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
  step: string;
  overall_summary: string | null;
}

/**
 * Load feed data from step 3 output
 */
export function loadFeedData(): FeedData {
  // Check for environment variable override first
  if (process.env.NOCTUA_DATA_PATH) {
    if (existsSync(process.env.NOCTUA_DATA_PATH)) {
      console.log(
        `Loading data from override: ${process.env.NOCTUA_DATA_PATH}`
      );
      const rawData = readFileSync(process.env.NOCTUA_DATA_PATH, "utf-8");
      return JSON.parse(rawData) as FeedData;
    }
    console.warn(
      `Override path ${process.env.NOCTUA_DATA_PATH} not found, falling back to defaults`
    );
  }

  // Try paths in order
  for (const relativePath of FALLBACK_PATHS) {
    const fullPath = join(PROJECT_ROOT, relativePath);
    if (existsSync(fullPath)) {
      console.log(`Loading data from: ${fullPath}`);
      const rawData = readFileSync(fullPath, "utf-8");
      return JSON.parse(rawData) as FeedData;
    }
  }

  console.warn(`No data found in any of the fallback paths, using empty data`);
  return {
    sections: [],
    processed_at: new Date().toISOString(),
    step: "none",
    overall_summary: null,
  };
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
        new Date(a.published || 0).getTime()
    );
}

/**
 * Get articles for a specific section
 */
export function getSectionArticles(
  data: FeedData,
  sectionId: string
): Article[] {
  const section = data.sections.find((s) => s.id === sectionId);
  if (!section) return [];

  return section.feeds
    .flatMap((f) => f.articles)
    .sort(
      (a, b) =>
        new Date(b.published || 0).getTime() -
        new Date(a.published || 0).getTime()
    );
}
