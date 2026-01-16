<script lang="ts">
  import { onMount } from "svelte";
  import type { Article, Section } from "../lib/data";
  import {
    getFilters,
    getHiddenFeeds,
    getPreferences,
    getReadArticles,
    markAsRead,
  } from "../lib/storage";
  import ArticleCard from "./ArticleCard.svelte";

  interface Props {
    articles: Article[];
    sections: Section[];
    groupBySection?: boolean;
  }

  let { articles, sections, groupBySection = true }: Props = $props();

  let readArticles = $state<Set<string>>(new Set());
  let hiddenFeeds = $state<Set<string>>(new Set());
  let searchQuery = $state("");
  let showReadArticles = $state(true);
  let compactView = $state(false);

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

    // Filter by read status
    if (!showReadArticles) {
      result = result.filter((a) => !readArticles.has(a.id));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.summary?.toLowerCase().includes(query) ||
          a.feed_name.toLowerCase().includes(query)
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
    hiddenFeeds = getHiddenFeeds();

    const filters = getFilters();
    const prefs = getPreferences();

    searchQuery = filters.searchQuery;
    showReadArticles = prefs.showReadArticles;
    compactView = prefs.compactView;

    // Listen for filter changes
    window.addEventListener("filtersChanged", ((e: CustomEvent) => {
      searchQuery = e.detail.searchQuery;
    }) as EventListener);

    window.addEventListener("preferencesChanged", ((e: CustomEvent) => {
      showReadArticles = e.detail.showReadArticles;
      compactView = e.detail.compactView;
    }) as EventListener);

    window.addEventListener("feedsChanged", ((e: CustomEvent) => {
      hiddenFeeds = e.detail.hiddenFeeds;
    }) as EventListener);

    window.addEventListener("readHistoryCleared", () => {
      readArticles = new Set();
    });
  });

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
              <ArticleCard
                {article}
                isRead={readArticles.has(article.id)}
                {compactView}
                onArticleClick={() => handleArticleClick(article.id)}
              />
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
        <ArticleCard
          {article}
          isRead={readArticles.has(article.id)}
          {compactView}
          onArticleClick={() => handleArticleClick(article.id)}
        />
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
