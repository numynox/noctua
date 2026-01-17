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
  let compactView = $state(false);

  // Store initial read/seen state for filtering
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
        if (
          rect.bottom < 0 &&
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
          // Mark as seen when article completely leaves the viewport (scrolled past)
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
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

    // Filter by read/seen status (only hide articles that were read/seen at page load)
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

  onMount(() => {
    readArticles = getReadArticles();
    seenArticles = getSeenArticles();
    hiddenFeeds = getHiddenFeeds();

    // Store initial state for filtering
    initialReadArticles = { ...readArticles };
    initialSeenArticles = { ...seenArticles };

    const filters = getFilters();
    const prefs = getPreferences();

    searchQuery = filters.searchQuery;
    hideSeenArticles = prefs.hideSeenArticles;
    autoMarkAsSeen = prefs.autoMarkAsSeen;
    compactView = prefs.compactView;

    // If articles will be hidden, scroll to top after a short delay to prevent auto-marking
    if (
      hideSeenArticles &&
      (Object.keys(initialReadArticles).length > 0 ||
        Object.keys(initialSeenArticles).length > 0)
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
      compactView = e.detail.compactView;

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
      readArticles = {};
    });

    // Set up scroll detection for auto-marking as seen (with delay to prevent auto-marking on reload)
    if (autoMarkAsSeen) {
      setTimeout(() => {
        setupScrollDetection();
      }, 1000); // 1 second delay
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
          <!-- Section header - Only show if more than one section -->
          {#if sections.length > 1}
            <div class="flex items-center gap-3 mb-6">
              <span class="text-3xl">{section.icon}</span>
              <h2 class="text-2xl font-bold">{section.name}</h2>
              <span class="badge badge-lg badge-ghost font-mono ml-auto">
                {articlesBySection.get(section.id)?.length || 0}
              </span>
            </div>
          {/if}

          <!-- Articles grid -->
          <div
            class="grid gap-6"
            class:grid-cols-1={compactView}
            class:md:grid-cols-2={!compactView}
          >
            {#each articlesBySection.get(section.id) || [] as article}
              <div data-article-id={article.id} use:observeArticle>
                <ArticleCard
                  {article}
                  isRead={article.id in readArticles}
                  isSeen={article.id in seenArticles}
                  readTimestamp={readArticles[article.id]?.timestamp || null}
                  {compactView}
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
    <div
      class="grid gap-6"
      class:grid-cols-1={compactView}
      class:md:grid-cols-2={!compactView}
    >
      {#each filteredArticles as article}
        <div data-article-id={article.id} use:observeArticle>
          <ArticleCard
            {article}
            isRead={article.id in readArticles}
            isSeen={article.id in seenArticles}
            readTimestamp={readArticles[article.id]?.timestamp || null}
            {compactView}
            onArticleClick={() => handleArticleClick(article.id)}
          />
        </div>
      {/each}
    </div>
  {/if}

  <!-- Empty state -->
  {#if filteredArticles.length === 0}
    <div
      class="text-center py-20 bg-base-200/50 rounded-3xl border border-dashed border-base-300"
    >
      <div class="text-6xl mb-4">🔍</div>
      <h3 class="text-xl font-bold mb-2">No articles found</h3>
      <p class="text-base-content/50">
        Try adjusting your search or check your feed visibility settings.
      </p>
    </div>
  {/if}
</div>
