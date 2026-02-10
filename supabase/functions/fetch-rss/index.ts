import { createClient } from '@supabase/supabase-js';
import { parseFeed } from 'rss';

interface Feed {
  id: number;
  url: string;
  filter: Record<string, any>; // JSON column
}

interface ArticleInsert {
  feed_id: number;
  title: string | null;
  url: string;
  published_at: string | null; // ISO string
  updated_at: string | null;   // ISO string
  author: string | null;
  summary: string | null;
  image_url: string | null;
  tags: string[] | null;
}

Deno.serve(async (req) => {
  try {
    // 1. Initialize Supabase Client (Service Role key required for backend ops)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Fetch all enabled feeds
    const { data: feeds, error: feedsError } = await supabase
      .from('feeds')
      .select('id, url, filter')
      .eq('enabled', true);

    if (feedsError) throw feedsError;
    if (!feeds || feeds.length === 0) {
      return new Response(JSON.stringify({ message: 'No enabled feeds found' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results = [];

    // 3. Process feeds concurrently
    const feedPromises = feeds.map(async (feed: Feed) => {
      try {
        // Fetch the RSS content
        const response = await fetch(feed.url);
        if (!response.ok) throw new Error(`Failed to fetch ${feed.url}: ${response.statusText}`);
        
        const xml = await response.text();
        
        // Parse the feed (handles RSS 1.0, 2.0, Atom)
        const feedData = await parseFeed(xml);
        
        // Map RSS entries to your DB Schema
        const articlesToUpsert: ArticleInsert[] = feedData.entries.map((entry) => {
            
          // Extract image: Try standard media tag, or fallback to first image in content
          let imageUrl = null;
          if (entry.attachments && entry.attachments.length > 0) {
             imageUrl = entry.attachments[0].url;
          } else if (entry['media:content'] && entry['media:content'].url) {
             // Sometimes parsed as custom field depending on library version
             imageUrl = entry['media:content'].url;
          }

          // Extract author: Handle object or string variations
          const author = entry.author ? (typeof entry.author === 'string' ? entry.author : entry.author.name) : null;

          // Extract tags/categories
          const tags = entry.categories ? entry.categories.map(c => c.term || c.label || c) : [];

          return {
            feed_id: feed.id,
            title: entry.title?.value || 'Untitled',
            url: entry.links[0]?.href || entry.id, // entry.id is often the URL in RSS
            published_at: entry.published ? new Date(entry.published).toISOString() : new Date().toISOString(),
            updated_at: entry.updated ? new Date(entry.updated).toISOString() : new Date().toISOString(),
            author: author,
            summary: entry.description?.value || entry.content?.value || null,
            image_url: imageUrl,
            tags: tags.length > 0 ? tags : null
          };
        });

        if (articlesToUpsert.length === 0) return { feed: feed.id, status: 'No articles found' };

        // 4. Upsert into Database
        // 'onConflict' tells Supabase to check the (feed_id, url) constraint we created
        const { error: upsertError } = await supabase
          .from('articles')
          .upsert(articlesToUpsert, { 
            onConflict: 'feed_id, url', 
            ignoreDuplicates: false // Set to true if you NEVER want to update existing articles
          });

        if (upsertError) throw upsertError;

        return { feed: feed.id, count: articlesToUpsert.length, status: 'Success' };

      } catch (err) {
        console.error(`Error processing feed ${feed.id}:`, err);
        return { feed: feed.id, error: err.message };
      }
    });

    const processingResults = await Promise.all(feedPromises);

    return new Response(JSON.stringify(processingResults), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});