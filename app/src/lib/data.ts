/**
 * Data loader for Astro pages
 * Loads the processed feed data from summarize step output
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "..", "..", "..");
const DATA_PATH =
  process.env.NOCTUA_STEP3_OUTPUT ||
  join(PROJECT_ROOT, "output", "summarize.json");

export interface Article {
  id: string;
  title: string;
  url: string;
  published: string | null;
  author: string | null;
  summary: string | null;
  clean_content: string | null;
  ai_summary: string | null;
  feed_name: string;
  section_id: string;
  tags: string[];
  word_count: number;
}

export interface Feed {
  id: string;
  name: string;
  url: string;
  section_id: string;
  title: string | null;
  description: string | null;
  articles: Article[];
  fetch_status: string;
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
  if (!existsSync(DATA_PATH)) {
    console.warn(`Feed data not found at ${DATA_PATH}, using empty data`);
    return {
      sections: [],
      processed_at: new Date().toISOString(),
      step: "none",
      overall_summary: null,
    };
  }

  const rawData = readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(rawData) as FeedData;
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
