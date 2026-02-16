import { createClient } from "@supabase/supabase-js";
import { parseFeed } from "rss";
import { applyFeedFilters } from "./lib/filter.ts";
import { mapFeedEntriesToArticles } from "./lib/processor.ts";
import type { FeedRecord, FeedResult } from "./lib/types.ts";

Deno.serve(async (req) => {
  try {
    const invokeSecret = Deno.env.get("FETCH_RSS_INVOKE_SECRET") || "";
    if (!invokeSecret) {
      return new Response(
        JSON.stringify({ error: "FETCH_RSS_INVOKE_SECRET is not configured" }) +
          "\n",
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";

    if (!token || token !== invokeSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }) + "\n", {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: feeds, error: feedsError } = await supabase
      .from("feeds")
      .select("id, url, filter")
      .eq("enabled", true);

    if (feedsError) throw feedsError;
    if (!feeds || feeds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No enabled feeds found" }) + "\n",
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const feedResults: FeedResult[] = [];

    const work = feeds.map(async (row: any) => {
      const feed: FeedRecord = { id: row.id, url: row.url, filter: row.filter };
      try {
        const response = await fetch(feed.url);
        if (!response.ok)
          throw new Error(
            `Failed to fetch ${feed.url}: ${response.statusText}`,
          );
        const xml = await response.text();

        const parsed = await parseFeed(xml);
        const mapped = mapFeedEntriesToArticles(parsed.entries || [], feed);

        if (!mapped || mapped.length === 0) {
          return {
            feed: feed.id,
            total: 0,
            filtered: 0,
            upserted: 0,
            status: "No articles found",
          } as FeedResult;
        }

        const { filteredArticles, total, filteredOut } = applyFeedFilters(
          mapped,
          feed,
        );

        if (!filteredArticles || filteredArticles.length === 0) {
          return {
            feed: feed.id,
            total,
            filtered: filteredOut,
            upserted: 0,
            status: "No articles after filtering",
          } as FeedResult;
        }

        const { error: upsertError } = await supabase
          .from("articles")
          .upsert(filteredArticles, {
            onConflict: "feed_id, url",
            ignoreDuplicates: false,
          });

        if (upsertError) throw upsertError;

        return {
          feed: feed.id,
          total,
          filtered: filteredOut,
          upserted: filteredArticles.length,
          status: "Success",
        } as FeedResult;
      } catch (err) {
        console.error(`Error processing feed ${feed.id}:`, err);
        return { feed: feed.id, error: err.message } as FeedResult;
      }
    });

    const results = await Promise.all(work);
    return new Response(JSON.stringify(results) + "\n", {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }) + "\n", {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
