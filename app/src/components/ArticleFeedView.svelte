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
  let unreadAndUnseenDisplayed = $state(0);
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

  let sectionIcon = $derived.by(() => {
    if (!selectedSectionId) return "🦉";
    return (
      sections.find((section) => section.id === selectedSectionId)?.icon || "🦉"
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

  function handleStatsChange(count: number) {
    unreadAndUnseenDisplayed = count;
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
      errorMessage = message;
      isLoggedIn = false;
      sections = [];
      articles = [];
      selectedSectionId = null;
      selectedFeedId = null;
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
  <div
    class="sticky top-0 z-20 mb-6 -mx-6 lg:-mx-8 px-6 lg:px-8 bg-base-100/80 backdrop-blur-md border-b border-base-300/60"
  >
    <div class="py-3 flex items-center justify-between gap-4">
      {#if selectedSectionId}
        <a
          href={sectionHref(selectedSectionId)}
          class="flex items-center gap-2 text-3xl font-bold hover:text-primary transition-colors"
        >
          <span class="text-2xl md:hidden" aria-hidden="true"
            >{sectionIcon}</span
          >
          <span>{sectionTitle}</span>
        </a>
      {:else}
        <h1 class="flex items-center gap-2 text-3xl font-bold">
          <span class="text-2xl md:hidden" aria-hidden="true"
            >{sectionIcon}</span
          >
          <span>{sectionTitle}</span>
        </h1>
      {/if}

      <div class="flex items-center gap-2">
        <span
          class="badge badge-neutral badge-md md:badge-xl"
          title="Unread and unseen articles"
          aria-label="Unread and unseen articles"
          >{unreadAndUnseenDisplayed}</span
        >
      </div>
    </div>
  </div>

  <ArticleList {articles} onStatsChange={handleStatsChange} />
{/if}
