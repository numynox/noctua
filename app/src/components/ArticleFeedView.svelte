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
  let sections = $state<Section[]>([]);
  let articles = $state<Article[]>([]);
  let loginHref = $state("/login");

  let sectionTitle = $derived.by(() => {
    if (!selectedSectionId) return "All Sections";
    return (
      sections.find((section) => section.id === selectedSectionId)?.name ||
      "Selected Section"
    );
  });

  function getSelectedSectionFromUrl() {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("section");
  }

  async function refreshContent() {
    loading = true;
    errorMessage = "";

    try {
      const selectedFromUrl = getSelectedSectionFromUrl();
      const content = await loadUserContent(selectedFromUrl);

      sections = content.sections;
      articles = content.articles;
      selectedSectionId = content.selectedSectionId;
      isLoggedIn = content.isLoggedIn;

      if (!isLoggedIn) {
        window.location.replace(loginHref);
        return;
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
      const baseUrl = document.documentElement.dataset.baseUrl || "/";
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
    <h1 class="text-3xl font-bold">{sectionTitle}</h1>
    <p class="text-base-content/60">
      {selectedSectionId
        ? "Showing the latest articles for this section."
        : "Showing the latest articles across all your sections."}
    </p>
  </div>

  <ArticleList {articles} {sections} contextId={selectedSectionId || "home"} />
{/if}
