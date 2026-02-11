export interface FeedRecord {
  id: number;
  url: string;
  filter: Record<string, any> | string;
}

export interface ArticleInsert {
  feed_id: number;
  title: string | null;
  url: string | undefined;
  published_at: string | null;
  updated_at: string | null;
  author: string | null;
  summary: string | null;
  image_url: string | null;
  tags: string[] | null;
}

export type FeedResult = {
  feed: number;
  total?: number;
  filtered?: number;
  upserted?: number;
  status?: string;
  error?: string;
};
