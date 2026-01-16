<script lang="ts">
  import { marked } from "marked";
  import { onMount } from "svelte";
  import type { Article, Section } from "../lib/data";
  import {
    getFilters,
    getHiddenSections,
    getPreferences,
    getReadArticles,
    markAsRead,
  } from "../lib/storage";
  import ArticleCard from "./ArticleCard.svelte";

  interface Props {
    articles: Article[];
    sections: Section[];
  }

  let { articles, sections }: Props = $props();

  let readArticles = $state<Set<string>>(new Set());
  let hiddenSections = $state<Set<string>>(new Set());
  let searchQuery = $state("");
  let dateRange = $state<"all" | "today" | "week" | "month">("all");
  let showReadArticles = $state(true);
  let compactView = $state(false);

  // Filtered articles
  let filteredArticles = $derived.by(() => {
    let result = articles;

    // Filter by hidden sections
    if (hiddenSections.size > 0) {
      result = result.filter((a) => !hiddenSections.has(a.section_id));
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

    // Filter by date range
    if (dateRange !== "all") {
      const now = new Date();
      const cutoff = new Date();

      switch (dateRange) {
        case "today":
          cutoff.setHours(0, 0, 0, 0);
          break;
        case "week":
          cutoff.setDate(cutoff.getDate() - 7);
          break;
        case "month":
          cutoff.setMonth(cutoff.getMonth() - 1);
          break;
      }

      result = result.filter((a) => {
        if (!a.published) return false;
        return new Date(a.published) >= cutoff;
      });
    }

    return result;
  });

  // Group articles by section
  let articlesBySection = $derived.by(() => {
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
    hiddenSections = getHiddenSections();

    const filters = getFilters();
    const prefs = getPreferences();

    searchQuery = filters.searchQuery;
    dateRange = filters.dateRange;
    showReadArticles = prefs.showReadArticles;
    compactView = prefs.compactView;

    // Listen for filter changes
    window.addEventListener("filtersChanged", ((e: CustomEvent) => {
      searchQuery = e.detail.searchQuery;
      dateRange = e.detail.dateRange;
    }) as EventListener);

    window.addEventListener("preferencesChanged", ((e: CustomEvent) => {
      showReadArticles = e.detail.showReadArticles;
      compactView = e.detail.compactView;
    }) as EventListener);

    window.addEventListener("sectionsChanged", ((e: CustomEvent) => {
      hiddenSections = e.detail.hiddenSections;
    }) as EventListener);

    window.addEventListener("readHistoryCleared", () => {
      readArticles = new Set();
    });
  });

  function handleArticleClick(articleId: string) {
    markAsRead(articleId);
    readArticles = getReadArticles();
  }

  function getSectionById(sectionId: string): Section | undefined {
    return sections.find((s) => s.id === sectionId);
  }
</script>

<div class="space-y-8">
  <!-- Results count -->
  <div class="text-sm text-base-content/60">
    Showing {filteredArticles.length} of {articles.length} articles
  </div>

  <!-- Articles grouped by section -->
  {#each sections as section}
    {#if !hiddenSections.has(section.id) && articlesBySection.has(section.id)}
      <section id="section-{section.id}" class="scroll-mt-20">
        <!-- Section header -->
        <div class="flex items-center gap-3 mb-4">
          <span class="text-2xl">{section.icon}</span>
          <div>
            <h2 class="text-xl font-bold">{section.name}</h2>
            <p class="text-sm text-base-content/60">{section.description}</p>
          </div>
          <span class="badge badge-primary ml-auto">
            {articlesBySection.get(section.id)?.length || 0}
          </span>
        </div>

        <!-- Section AI Summary -->
        {#if section.ai_summary}
          <div class="alert bg-base-200 mb-4">
            <span class="text-sm prose prose-sm max-w-none">
              {@html marked.parse(section.ai_summary)}
            </span>
          </div>
        {/if}

        <!-- Articles grid -->
        <div
          class="grid gap-4"
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
    {/if}
  {/each}

  <!-- Empty state -->
  {#if filteredArticles.length === 0}
    <div class="text-center py-12">
      <div class="text-4xl mb-4">🔍</div>
      <h3 class="text-lg font-semibold mb-2">No articles found</h3>
      <p class="text-base-content/60">
        Try adjusting your filters or search query
      </p>
    </div>
  {/if}
</div>
