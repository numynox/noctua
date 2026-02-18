<script lang="ts">
  import { onMount } from "svelte";
  import {
    getLoginHref,
    loadUserContent,
    onAuthStateChange,
  } from "../lib/data";
  import type { Article, Section } from "../lib/types";
  import ArticleList from "./ArticleList.svelte";

  let loading = $state(true);
  let errorMessage = $state("");
  let isLoggedIn = $state(false);
  let selectedSectionId = $state<string | null>(null);
  let selectedFeedId = $state<string | null>(null);
  let sections = $state<Section[]>([]);
  let articles = $state<Article[]>([]);
  let loginHref = $state("/login");
  let baseUrl = $state("/");

  let sectionTitle = $derived.by(() => {
    if (!selectedSectionId) return "No Sections";
    return (
      sections.find((section) => section.id === selectedSectionId)?.name ||
      "Section"
    );
  });

  function getSelectedSectionFromUrl() {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("section");
  }

  function getSelectedFeedFromUrl() {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("feed");
  }

  function sectionHref(sectionId: string) {
    return `${baseUrl}?section=${encodeURIComponent(sectionId)}`;
  }

  async function refreshContent() {
    loading = true;
    errorMessage = "";

    try {
      const selectedFromUrl = getSelectedSectionFromUrl();
      const selectedFeedFromUrl = getSelectedFeedFromUrl();
      const content = await loadUserContent(selectedFromUrl);

      sections = content.sections;
      selectedSectionId = content.selectedSectionId;
      isLoggedIn = content.isLoggedIn;

      if (!isLoggedIn) {
        window.location.replace(loginHref);
        return;
      }

      const selectedSection = sections.find(
        (section) => section.id === selectedSectionId,
      );
      selectedFeedId =
        selectedFeedFromUrl &&
        selectedSection?.feeds.some((feed) => feed.id === selectedFeedFromUrl)
          ? selectedFeedFromUrl
          : null;

      articles = selectedFeedId
        ? content.articles.filter(
            (article) => article.feed_id === selectedFeedId,
          )
        : content.articles;

      if (sections.length > 0 && selectedSectionId) {
        const currentUrl = new URL(window.location.href);
        const currentParam = currentUrl.searchParams.get("section");
        const currentFeedParam = currentUrl.searchParams.get("feed");

        if (currentParam !== selectedSectionId) {
          currentUrl.searchParams.set("section", selectedSectionId);
        }

        if (selectedFeedId) {
          currentUrl.searchParams.set("feed", selectedFeedId);
        } else {
          currentUrl.searchParams.delete("feed");
        }

        const sectionChanged = currentParam !== selectedSectionId;
        const feedChanged = (currentFeedParam || null) !== selectedFeedId;
        if (sectionChanged || feedChanged) {
          window.history.replaceState({}, "", currentUrl.toString());
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // If env is not configured or profile is missing, expose a concise message.
      errorMessage = message;
      isLoggedIn = false;
      sections = [];
      articles = [];
      selectedSectionId = null;
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (typeof document !== "undefined") {
      baseUrl = document.documentElement.dataset.baseUrl || "/";
      loginHref = getLoginHref(baseUrl);
    }

    refreshContent();

    const { data } = onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        refreshContent();
      }
    });

    const handlePopState = () => {
      refreshContent();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("popstate", handlePopState);
    };
  });
</script>

{#if loading}
  <div class="flex items-center justify-center min-h-[40vh]">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else if errorMessage}
  <div class="alert alert-error max-w-3xl mx-auto">
    <span>{errorMessage}</span>
  </div>
{:else if !isLoggedIn}
  <div class="flex items-center justify-center min-h-[40vh]">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else}
  <div class="mb-6">
    {#if selectedSectionId}
      <a
        href={sectionHref(selectedSectionId)}
        class="text-3xl font-bold hover:text-primary transition-colors"
      >
        {sectionTitle}
      </a>
    {:else}
      <h1 class="text-3xl font-bold">{sectionTitle}</h1>
    {/if}
    <p class="text-base-content/60">
      Showing the latest articles for this section.
    </p>
  </div>

  <ArticleList {articles} />
{/if}
