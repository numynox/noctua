<script lang="ts">
  import { onMount } from "svelte";
  import type { Article, Section } from "../lib/data";
  import type { ArticleStatuses } from "../lib/storage";
  import {
    getFilters,
    getHiddenFeeds,
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
    groupBySection?: boolean;
  }

  let { articles, sections, groupBySection = true }: Props = $props();

  let readArticles = $state<ArticleStatuses>({});
  let seenArticles = $state<ArticleStatuses>({});
  let hiddenFeeds = $state<Set<string>>(new Set());
  let searchQuery = $state("");
  let hideSeenArticles = $state(true);
  let autoMarkAsSeen = $state(true);

  // Snapshot of read/seen state at page load. We use these snapshots
  // for filtering so articles marked as seen/read during the current
  // session are not immediately hidden — they will be hidden after
  // a page refresh. Live `readArticles`/`seenArticles` are still used
  // for counts and UI state.
  let initialReadArticles = $state<ArticleStatuses>({});
  let initialSeenArticles = $state<ArticleStatuses>({});

  // Intersection observer to mark articles as seen
  let observer: IntersectionObserver | null = null;
  let scrollHandler: (() => void) | null = null;
  let hasUserScrolled = false;

  function setupScrollDetection() {
    if (scrollHandler) {
      window.removeEventListener("scroll", scrollHandler);
    }

    scrollHandler = () => {
      // Mark that user has scrolled
      hasUserScrolled = true;

      // Check all article elements that are currently rendered
      const articleElements = document.querySelectorAll("[data-article-id]");
      articleElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const articleId = element.getAttribute("data-article-id");

        // Mark as seen if article is above viewport (scrolled past) and not already marked
        // but only if it is within one viewport height above the top. This
        // prevents marking items that were jumped far past (e.g., from a
        // navigation or rapid scroll).
        const bottom = rect.bottom;
        const viewportH =
          window.innerHeight || document.documentElement.clientHeight || 0;
        if (
          bottom < 0 &&
          bottom > -viewportH &&
          articleId &&
          !readArticles[articleId] &&
          !seenArticles[articleId]
        ) {
          markAsSeen(articleId);
          seenArticles = getSeenArticles();
        }
      });
    };

    window.addEventListener("scroll", scrollHandler, { passive: true });
  }

  function setupObserver() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Mark as seen when article leaves the viewport from the top, but
          // only if it is within one viewport height above the top. This
          // avoids marking items that were scrolled/jumped far out of view.
          if (!entry.isIntersecting) {
            const bottom = entry.boundingClientRect.bottom;
            const viewportH =
              window.innerHeight || document.documentElement.clientHeight || 0;
            if (bottom < 0 && bottom > -viewportH) {
              const articleId = entry.target.getAttribute("data-article-id");
              if (
                articleId &&
                !readArticles[articleId] &&
                !seenArticles[articleId]
              ) {
                markAsSeen(articleId);
                seenArticles = getSeenArticles();
              }
            }
          }
        });
      },
      {
        threshold: 0, // Trigger when element completely enters/leaves viewport
        rootMargin: "0px",
      },
    );
  }

  // Filtered articles
  let filteredArticles = $derived.by(() => {
    let result = articles;

    // Filter by hidden feeds
    if (hiddenFeeds.size > 0) {
      result = result.filter((a) => {
        const section = sections.find((s) => s.id === a.section_id);
        const feed = section?.feeds.find((f) => f.name === a.feed_name);
        return !feed || !hiddenFeeds.has(feed.id);
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

  // Group articles by section if requested
  let articlesBySection = $derived.by(() => {
    if (!groupBySection) return null;

    const grouped = new Map<string, Article[]>();
    for (const article of filteredArticles) {
      const list = grouped.get(article.section_id) || [];
      list.push(article);
      grouped.set(article.section_id, list);
    }
    return grouped;
  });

  // Count of articles in the current filtered set that are not read/seen
  let unreadFilteredCount = $derived.by(() => {
    return filteredArticles.filter(
      (a) => !readArticles[a.id] && !seenArticles[a.id],
    ).length;
  });

  onMount(() => {
    readArticles = getReadArticles();
    seenArticles = getSeenArticles();
    hiddenFeeds = getHiddenFeeds();

    // Snapshot the initial read/seen state for filtering (so items
    // marked during this session are not hidden immediately).
    initialReadArticles = { ...readArticles };
    initialSeenArticles = { ...seenArticles };

    const filters = getFilters();
    const prefs = getPreferences();

    searchQuery = filters.searchQuery;
    hideSeenArticles = prefs.hideSeenArticles;
    autoMarkAsSeen = prefs.autoMarkAsSeen;

    // If articles will be hidden, and there is existing read/seen history,
    // scroll to top after a short delay to prevent auto-marking on load
    if (
      hideSeenArticles &&
      (Object.keys(readArticles).length > 0 ||
        Object.keys(seenArticles).length > 0)
    ) {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    }

    // Listen for filter changes
    window.addEventListener("filtersChanged", ((e: CustomEvent) => {
      searchQuery = e.detail.searchQuery;
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
      if (observer) {
        observer.disconnect();
      }
      if (scrollHandler) {
        window.removeEventListener("scroll", scrollHandler);
      }
    };
  });

  function observeArticle(node: HTMLElement) {
    if (observer && autoMarkAsSeen) {
      observer.observe(node);
    }
    return {
      destroy() {
        if (observer) {
          observer.unobserve(node);
        }
      },
    };
  }

  function handleArticleClick(articleId: string) {
    markAsRead(articleId);
    readArticles = getReadArticles();
  }
</script>

<div class="space-y-8">
  <!-- Results count -->
  <div class="text-sm text-base-content/40 mb-6 font-medium">
    Showing {filteredArticles.length} of {articles.length} articles
  </div>

  {#if groupBySection && articlesBySection}
    <!-- Articles grouped by section -->
    {#each sections as section}
      {#if articlesBySection.has(section.id)}
        <section id="section-{section.id}" class="scroll-mt-24">
          <!-- Articles grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {#each articlesBySection.get(section.id) || [] as article}
              <div data-article-id={article.id} use:observeArticle>
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
        </section>
        {#if section !== sections[sections.length - 1] && sections.length > 1}
          <div class="divider opacity-10 py-8"></div>
        {/if}
      {/if}
    {/each}
  {:else}
    <!-- Flat list (Home page) -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      {#each filteredArticles as article}
        <div data-article-id={article.id} use:observeArticle>
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
  {/if}

  <!-- Large 'All Caught Up' area always present after the list so users can scroll to it -->
  <div class="min-h-screen mt-8 flex items-center justify-center">
    <div
      class="text-center py-20 bg-base-200/50 rounded-3xl border border-dashed border-base-300 w-full max-w-3xl"
    >
      <div class="text-6xl mb-4">✅</div>
      <h3 class="text-2xl font-bold mb-2">You're all caught up</h3>
      <p class="text-base-content/60 mb-6 px-16">
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
