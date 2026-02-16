import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase";
import type { Article, Feed, Section, UserContent } from "./types";

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const supabase = getSupabaseClient();
  return supabase.auth.onAuthStateChange(callback);
}

async function ensureProfile(userId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "No profile row found for this user. Verify the auth profile trigger migration is applied.",
    );
  }
}

export async function fetchSectionsForUser(userId: string): Promise<Section[]> {
  await ensureProfile(userId);

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sections")
    .select(
      `
      id,
      title,
      icon,
      sections_feeds (
        feed_id,
        feeds (
          id,
          name,
          url,
          enabled
        )
      )
    `,
    )
    .eq("user_id", userId)
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((section: any) => {
    const feeds: Feed[] = (section.sections_feeds || [])
      .map((joinRow: any) => joinRow.feeds)
      .filter((feed: any) => feed && feed.enabled !== false)
      .map((feed: any) => ({
        id: String(feed.id),
        name: feed.name,
        url: feed.url,
      }));

    return {
      id: String(section.id),
      name: section.title,
      icon: section.icon || "🦉",
      feeds,
    };
  });
}

export async function fetchHomeFeedsForUser(userId: string): Promise<Feed[]> {
  await ensureProfile(userId);

  const supabase = getSupabaseClient();
  const { data, error } = await (supabase as any).rpc("get_user_home_feeds", {
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }

  return ((data as any[]) || []).map((feed: any) => ({
    id: String(feed.id),
    name: feed.name,
    url: feed.url,
  }));
}

export async function fetchArticlesForSections(
  sections: Section[],
  selectedSectionId?: string | null,
  limit = 300,
): Promise<Article[]> {
  const scopedSections = selectedSectionId
    ? sections.filter((section) => section.id === selectedSectionId)
    : sections;

  const feedMap = new Map<string, Feed>();
  for (const section of scopedSections) {
    for (const feed of section.feeds) {
      feedMap.set(feed.id, feed);
    }
  }

  const feedIds = Array.from(feedMap.keys());
  if (feedIds.length === 0) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("articles")
    .select(
      "id,feed_id,title,url,published_at,updated_at,author,summary,image_url,tags",
    )
    .in("feed_id", feedIds)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data || []).map((article: any) => {
    const feedId = String(article.feed_id);
    const feed = feedMap.get(feedId);

    return {
      id: String(article.id),
      feed_id: feedId,
      feed_name: feed?.name || "Unknown feed",
      title: article.title || "Untitled",
      url: article.url,
      published: article.published_at,
      updated: article.updated_at,
      author: article.author,
      summary: article.summary,
      image_url: article.image_url,
      tags: Array.isArray(article.tags) ? article.tags : [],
    };
  });
}

export async function loadUserContent(
  selectedSectionId?: string | null,
): Promise<UserContent> {
  const session = await getSession();
  if (!session?.user) {
    return {
      isLoggedIn: false,
      sections: [],
      articles: [],
      selectedSectionId: null,
    };
  }

  const sections = await fetchSectionsForUser(session.user.id);
  const isValidSelectedSection =
    !!selectedSectionId &&
    sections.some((section) => section.id === selectedSectionId);
  const normalizedSelectedSectionId = isValidSelectedSection
    ? selectedSectionId!
    : null;
  const articles = await fetchArticlesForSections(
    sections,
    normalizedSelectedSectionId,
  );

  return {
    isLoggedIn: true,
    sections,
    articles,
    selectedSectionId: normalizedSelectedSectionId,
  };
}

export function getLoginHref(baseUrl = "/") {
  const normalizedBase = baseUrl === "/" ? "" : baseUrl.replace(/\/$/, "");
  return `${normalizedBase}/login`;
}
