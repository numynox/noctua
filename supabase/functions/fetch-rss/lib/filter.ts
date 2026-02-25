import { ArticleInsert, FeedRecord } from "./types.ts";

export function applyFeedFilters(articles: ArticleInsert[], feed: FeedRecord) {
  let filterObj: any = {};
  try {
    if (typeof (feed as any).filter === "string")
      filterObj = JSON.parse((feed as any).filter || "{}");
    else filterObj = (feed as any).filter || {};
  } catch (e) {
    console.warn(`Failed to parse filter for feed ${feed.id}:`, e);
    filterObj = {};
  }

  const excludeTitle: string[] = Array.isArray(filterObj.exclude_title)
    ? filterObj.exclude_title.map((k: string) => (k || "").toLowerCase())
    : [];
  const excludeSummary: string[] = Array.isArray(filterObj.exclude_summary)
    ? filterObj.exclude_summary.map((k: string) => (k || "").toLowerCase())
    : [];
  const includeUrlStrings: string[] = Array.isArray(filterObj.include_url)
    ? filterObj.include_url.map((s: string) => (s || "").toLowerCase())
    : [];
  const excludeUrlStrings: string[] = Array.isArray(filterObj.exclude_url)
    ? filterObj.exclude_url.map((s: string) => (s || "").toLowerCase())
    : [];

  const filtered = articles.filter((a) => {
    const title = (a.title || "").toLowerCase();
    const summary = (a.summary || "").toLowerCase();
    const url = (a.url || "").toLowerCase();

    // Check exclude_title
    for (const kw of excludeTitle) {
      if (!kw) continue;
      if (title.includes(kw)) return false;
    }
    // Check exclude_summary
    for (const kw of excludeSummary) {
      if (!kw) continue;
      if (summary.includes(kw)) return false;
    }
    // Check include_url: ALL strings must be present in URL
    if (includeUrlStrings.length > 0) {
      for (const s of includeUrlStrings) {
        if (!s) continue;
        if (!url.includes(s)) return false;
      }
    }
    // Check exclude_url: ANY string presence excludes the article
    for (const s of excludeUrlStrings) {
      if (!s) continue;
      if (url.includes(s)) return false;
    }
    return true;
  });

  return {
    filteredArticles: filtered,
    total: articles.length,
    filteredOut: articles.length - filtered.length,
  };
}
