<script lang="ts">
  import { onMount } from "svelte";
  import type { Article, Section } from "../lib/data";
  import type { ArticleStatuses } from "../lib/storage";
  import {
    getFilters,
    getHiddenFeedsForContext,
    getPreferences,
    getReadArticles,
    getSeenArticles,
    markAsRead,
    markAsSeen,
  } from "../lib/storage";
  import ArticleCard from "./ArticleCard.svelte";

  interface Props {
    articles: Article[];
    sections: Section[];
    contextId?: string;
  }

  let { articles, sections, contextId = "home" }: Props = $props();

  let readArticles = $state<ArticleStatuses>({});
  let seenArticles = $state<ArticleStatuses>({});
  let hiddenFeeds = $state<Set<string>>(new Set());
  let searchQuery = $state("");
  let hideSeenArticles = $state(true);
  let autoMarkAsSeen = $state(true);
  // Only render the list after initial storage/prefs are loaded to avoid
  // a flash of unfiltered articles on first paint.
  let initialized = $state(false);

  // Snapshot of read/seen state at page load. We use these snapshots
  // for filtering so articles marked as seen/read during the current
  // session are not immediately hidden — they will be hidden after
  // a page refresh. Live `readArticles`/`seenArticles` are still used
  // for counts and UI state.
  let initialReadArticles = $state<ArticleStatuses>({});
  let initialSeenArticles = $state<ArticleStatuses>({});

  // Scroll handler to mark articles as seen
  let scrollHandler: (() => void) | null = null;
  // Track last scroll position so we only mark as seen when scrolling down
  let lastScrollY = 0;

  function setupScrollDetection() {
    if (scrollHandler) {
      window.removeEventListener("scroll", scrollHandler);
    }

    // Initialize lastScrollY to current scroll position to avoid marking
    // items immediately when setting up detection.
    lastScrollY = window.scrollY || window.pageYOffset || 0;

    scrollHandler = () => {
      const currentScrollY = window.scrollY || window.pageYOffset || 0;
      // Only proceed when scrolling down
      if (currentScrollY <= lastScrollY) {
        lastScrollY = currentScrollY;
        return;
      }

      // Check all article elements that are currently rendered
      const articleElements = document.querySelectorAll("[data-article-id]");
      articleElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const articleId = element.getAttribute("data-article-id");

        // Mark as seen if article is above viewport (scrolled past) and not already marked
        // but only if it is within half the viewport height above the top. This
        // prevents marking items that were jumped far past (e.g., from a
        // navigation or rapid scroll).
        const bottom = rect.bottom;
        const viewportH =
          window.innerHeight || document.documentElement.clientHeight || 0;
        if (
          bottom < 0 &&
          bottom > -0.5 * viewportH &&
          articleId &&
          !readArticles[articleId] &&
          !seenArticles[articleId]
        ) {
          markAsSeen(articleId);
          seenArticles = getSeenArticles();
        }
      });

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", scrollHandler, { passive: true });
  }

  // Filtered articles
  let filteredArticles = $derived.by(() => {
    // If we haven't loaded storage/prefs yet, render nothing to avoid
    // briefly showing articles that will immediately be hidden.
    if (!initialized) return [];

    let result = articles;

    // Filter by hidden feeds (per-context). For this flat list component
    // use the 'home' context for hidden feeds.
    if (hiddenFeeds.size > 0) {
      result = result.filter((a) => {
        const section = sections.find((s) => s.id === a.section_id);
        const feed = section?.feeds.find((f) => f.name === a.feed_name);
        const contextHidden = getHiddenFeedsForContext(contextId);
        return !feed || !contextHidden.has(feed.id);
      });
    }

    // Filter by read/seen status (hide articles that were read/seen at page load)
    if (hideSeenArticles) {
      result = result.filter(
        (a) => !initialReadArticles[a.id] && !initialSeenArticles[a.id],
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.summary?.toLowerCase().includes(query) ||
          a.feed_name.toLowerCase().includes(query),
      );
    }

    return result;
  });

  onMount(() => {
    readArticles = getReadArticles();
    seenArticles = getSeenArticles();
    hiddenFeeds = getHiddenFeedsForContext(contextId);

    // Snapshot the initial read/seen state for filtering (so items
    // marked during this session are not hidden immediately).
    initialReadArticles = { ...readArticles };
    initialSeenArticles = { ...seenArticles };

    const filters = getFilters();
    const prefs = getPreferences();

    searchQuery = filters.searchQuery;
    hideSeenArticles = prefs.hideSeenArticles;
    autoMarkAsSeen = prefs.autoMarkAsSeen;

    // Mark initialization complete so filteredArticles can render.
    initialized = true;

    // Listen for filter changes
    window.addEventListener("filtersChanged", ((e: CustomEvent) => {
      searchQuery = e.detail.searchQuery;
      // When the search query changes, jump to the top so users see
      // results from the start of the list.
      try {
        window.scrollTo(0, 0);
      } catch (e) {
        /* ignore */
      }
    }) as EventListener);

    window.addEventListener("preferencesChanged", ((e: CustomEvent) => {
      hideSeenArticles = e.detail.hideSeenArticles;
      autoMarkAsSeen = e.detail.autoMarkAsSeen;

      // Update scroll detection when autoMarkAsSeen changes
      if (autoMarkAsSeen && !scrollHandler) {
        setTimeout(() => {
          setupScrollDetection();
        }, 1000);
      } else if (!autoMarkAsSeen && scrollHandler) {
        window.removeEventListener("scroll", scrollHandler);
        scrollHandler = null;
      }
    }) as EventListener);

    window.addEventListener("feedsChanged", ((e: CustomEvent) => {
      hiddenFeeds = e.detail.hiddenFeeds;
      // When feeds are hidden/unhidden, jump to top so the new
      // filtered list starts at the top of the viewport.
      try {
        window.scrollTo(0, 0);
      } catch (e) {
        /* ignore */
      }
    }) as EventListener);

    window.addEventListener("readHistoryCleared", () => {
      // When the read history is cleared, reload storage and update
      // the initial snapshots so previously-hidden articles reappear.
      readArticles = getReadArticles();
      seenArticles = getSeenArticles();
      initialReadArticles = { ...readArticles };
      initialSeenArticles = { ...seenArticles };
    });

    // On activity (markAsRead/markAsSeen) update live maps used for
    // counts/UI but do NOT update the initial snapshots so articles
    // are not hidden immediately.
    window.addEventListener("noctua:activity", () => {
      readArticles = getReadArticles();
      seenArticles = getSeenArticles();
    });

    // Set up scroll detection for auto-marking as seen (with delay to prevent auto-marking on reload)
    if (autoMarkAsSeen) {
      setTimeout(() => {
        setupScrollDetection();
      }, 1000); // 1 second delay
    }

    // If the page initially has no filtered articles, scroll to the bottom
    // so the always-present 'You're all caught up' area is visible.
    if (filteredArticles.length === 0) {
      setTimeout(() => {
        try {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          });
        } catch (e) {
          window.scrollTo(0, document.body.scrollHeight);
        }
      }, 150);
    }

    return () => {
      if (scrollHandler) {
        window.removeEventListener("scroll", scrollHandler);
      }
    };
  });

  function handleArticleClick(articleId: string) {
    markAsRead(articleId);
    readArticles = getReadArticles();
  }
</script>

<div class="space-y-4">
  <div class="text-sm text-base-content/40 font-medium">
    Showing {filteredArticles.length} of {articles.length} articles
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    {#each filteredArticles as article}
      <div data-article-id={article.id}>
        <ArticleCard
          {article}
          isRead={article.id in readArticles}
          isSeen={article.id in seenArticles}
          readTimestamp={readArticles[article.id]?.timestamp || null}
          onArticleClick={() => handleArticleClick(article.id)}
        />
      </div>
    {/each}
  </div>

  <!-- Large 'All Caught Up' area always present after the list so users can scroll to it -->
  <div class="min-h-screen mt-8 flex items-center justify-center">
    <div
      class="text-center py-8 md:py-20 bg-base-200/50 rounded-3xl border border-dashed border-base-300 w-full max-w-3xl"
    >
      <div class="text-6xl mb-4">✅</div>
      <h3 class="text-2xl font-bold mb-2">You're all caught up</h3>
      <p class="text-base-content/60 mb-6 px-6 md:px-16">
        There are no articles to show right now — either you've already viewed
        them, or your current filters hide some items.
      </p>
      <div class="flex items-center justify-center gap-3">
        <button
          class="btn btn-primary"
          onclick={() => {
            try {
              const url = new URL(window.location.href);
              url.searchParams.set("_noctua_reload", String(Date.now()));
              window.location.replace(url.toString());
            } catch (e) {
              window.location.reload();
            }
          }}
        >
          Reload Page
        </button>
      </div>
    </div>
  </div>
</div>
