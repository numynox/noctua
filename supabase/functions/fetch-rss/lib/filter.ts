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

  const titleKeywords: string[] = Array.isArray(
    filterObj.exclude_keywords_title,
  )
    ? filterObj.exclude_keywords_title.map((k: string) =>
        (k || "").toLowerCase(),
      )
    : [];
  const summaryKeywords: string[] = Array.isArray(
    filterObj.exclude_keywords_summary,
  )
    ? filterObj.exclude_keywords_summary.map((k: string) =>
        (k || "").toLowerCase(),
      )
    : [];

  const filtered = articles.filter((a) => {
    const title = (a.title || "").toLowerCase();
    const summary = (a.summary || "").toLowerCase();

    for (const kw of titleKeywords) {
      if (!kw) continue;
      if (title.includes(kw)) return false;
    }
    for (const kw of summaryKeywords) {
      if (!kw) continue;
      if (summary.includes(kw)) return false;
    }
    return true;
  });

  return {
    filteredArticles: filtered,
    total: articles.length,
    filteredOut: articles.length - filtered.length,
  };
}
