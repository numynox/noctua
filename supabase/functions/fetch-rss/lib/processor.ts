import {
  decodeHtmlEntities,
  decodeNumericEntities,
  extractFirstImageFromHtml,
  stripHtml,
} from "./html.ts";
import { ArticleInsert, FeedRecord } from "./types.ts";

// Map feed parser entries into ArticleInsert records
export function mapFeedEntriesToArticles(
  entries: any[],
  feed: FeedRecord,
): ArticleInsert[] {
  return entries.map((feedEntry: any) => {
    const entryUrl =
      feedEntry.links && feedEntry.links[0] && feedEntry.links[0].href
        ? feedEntry.links[0].href
        : feedEntry.id || undefined;

    // Prefer declared attachments / media fields
    let extractedImage: string | null = null;
    if (feedEntry.attachments && feedEntry.attachments.length > 0)
      extractedImage = feedEntry.attachments[0].url || null;
    if (
      !extractedImage &&
      feedEntry["media:content"] &&
      feedEntry["media:content"].url
    )
      extractedImage = feedEntry["media:content"].url;
    if (
      !extractedImage &&
      feedEntry["media:thumbnail"] &&
      feedEntry["media:thumbnail"].url
    )
      extractedImage = feedEntry["media:thumbnail"].url;

    const htmlContent = decodeNumericEntities(
      feedEntry.content?.value ||
        feedEntry.description?.value ||
        feedEntry.summary?.value ||
        feedEntry.summary ||
        null,
    );
    if (!extractedImage && htmlContent)
      extractedImage = extractFirstImageFromHtml(htmlContent, entryUrl);

    const author = decodeNumericEntities(
      decodeHtmlEntities(
        feedEntry.author
          ? typeof feedEntry.author === "string"
            ? feedEntry.author
            : feedEntry.author.name || null
          : null,
      ),
    );
    const tags = feedEntry.categories
      ? feedEntry.categories
          .map((c: any) => c.term || c.label || c)
          .map((tag: string) => decodeNumericEntities(decodeHtmlEntities(tag)))
      : [];

    const rawSummary = decodeNumericEntities(
      feedEntry.summary?.value ||
        feedEntry.description?.value ||
        feedEntry.content?.value ||
        feedEntry.summary ||
        null,
    );
    const cleanedSummary = decodeHtmlEntities(stripHtml(rawSummary));

    const article: ArticleInsert = {
      feed_id: feed.id,
      title: decodeNumericEntities(
        decodeHtmlEntities(
          feedEntry.title?.value || feedEntry.title || "Untitled",
        ),
      ),
      url: entryUrl,
      published_at: feedEntry.published
        ? new Date(feedEntry.published).toISOString()
        : new Date().toISOString(),
      updated_at: feedEntry.updated
        ? new Date(feedEntry.updated).toISOString()
        : new Date().toISOString(),
      author: author,
      summary: cleanedSummary,
      image_url: extractedImage || null,
      tags: tags.length > 0 ? tags : null,
    };

    return article;
  });
}
