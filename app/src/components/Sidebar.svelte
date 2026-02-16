<script lang="ts">
  import { onMount } from "svelte";
  import {
    fetchHomeFeedsForUser,
    fetchSectionsForUser,
    getSession,
    onAuthStateChange,
  } from "../lib/data";
  import {
    getFilters,
    getHiddenFeedsForContext,
    setFilters,
    toggleFeedVisibility,
  } from "../lib/storage";
  import type { Feed, Section } from "../lib/types";

  interface Props {
    activeId?: string; // 'home' or 'settings'
    baseUrl?: string;
  }

  let { activeId = "home", baseUrl = "/" }: Props = $props();

  let sections = $state<Section[]>([]);
  let isLoggedIn = $state(false);
  let selectedSectionId = $state<string | null>(null);
  let searchQuery = $state("");
  let isMobileMenuOpen = $state(false);
  let hiddenFeeds = $state<Set<string>>(new Set());
  let homeFeeds = $state<Feed[]>([]);

  const currentContextId = $derived.by(() => selectedSectionId || "home");

  const currentFeeds = $derived.by(() => {
    if (currentContextId === "home") {
      return homeFeeds;
    }

    const section = sections.find((item) => item.id === currentContextId);
    return section ? section.feeds : [];
  });

  function updateSelectedSectionFromUrl() {
    if (typeof window === "undefined") return;
    selectedSectionId = new URLSearchParams(window.location.search).get(
      "section",
    );
  }

  async function refreshSidebarData() {
    updateSelectedSectionFromUrl();

    const session = await getSession();
    isLoggedIn = !!session?.user;

    if (!session?.user) {
      sections = [];
      homeFeeds = [];
      hiddenFeeds = getHiddenFeedsForContext(currentContextId);
      return;
    }

    const [loadedSections, loadedHomeFeeds] = await Promise.all([
      fetchSectionsForUser(session.user.id),
      fetchHomeFeedsForUser(session.user.id),
    ]);

    sections = loadedSections;
    homeFeeds = loadedHomeFeeds;

    const selectedExists =
      !!selectedSectionId &&
      sections.some((section) => section.id === selectedSectionId);
    if (!selectedExists) {
      selectedSectionId = null;
    }

    hiddenFeeds = getHiddenFeedsForContext(currentContextId);
  }

  onMount(() => {
    const filters = getFilters();
    searchQuery = filters.searchQuery || "";

    refreshSidebarData();

    const { data } = onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        refreshSidebarData();
      }
    });

    const handlePopState = () => {
      refreshSidebarData();
    };

    window.addEventListener("popstate", handlePopState);

    window.addEventListener("filtersChanged", ((e: CustomEvent) => {
      searchQuery = e.detail.searchQuery;
    }) as EventListener);

    return () => {
      data.subscription.unsubscribe();
      window.removeEventListener("popstate", handlePopState);
    };
  });

  function updateSearch() {
    setFilters({ searchQuery });
    window.dispatchEvent(
      new CustomEvent("filtersChanged", {
        detail: { searchQuery },
      }),
    );
  }

  function toggleFeed(feedId: string) {
    toggleFeedVisibility(feedId, currentContextId);
    hiddenFeeds = getHiddenFeedsForContext(currentContextId);
    window.dispatchEvent(
      new CustomEvent("feedsChanged", { detail: { hiddenFeeds } }),
    );
  }

  function toggleMobileMenu() {
    isMobileMenuOpen = !isMobileMenuOpen;
  }

  function closeMobileMenu() {
    isMobileMenuOpen = false;
  }

  function sectionHref(sectionId: string) {
    return `${baseUrl}?section=${encodeURIComponent(sectionId)}`;
  }

  function settingsHref() {
    const normalizedBase = baseUrl === "/" ? "" : baseUrl.replace(/\/$/, "");
    return `${normalizedBase}/settings`;
  }
</script>

<div class="lg:hidden fixed bottom-6 right-6 z-50">
  <button
    onclick={toggleMobileMenu}
    class="btn btn-primary btn-circle shadow-lg"
    aria-label="Toggle Menu"
  >
    {#if isMobileMenuOpen}
      <span class="text-2xl">✕</span>
    {:else}
      <span class="text-2xl">☰</span>
    {/if}
  </button>
</div>

{#if isMobileMenuOpen}
  <div
    class="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
    onclick={closeMobileMenu}
    onkeydown={(e) => e.key === "Escape" && closeMobileMenu()}
    role="button"
    tabindex="0"
    aria-label="Close Menu"
  ></div>
{/if}

<aside
  class="fixed lg:sticky top-0 left-0 z-40 w-80 h-screen bg-base-200 border-r border-base-300 transform transition-transform duration-300 ease-in-out flex flex-col
    {isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
>
  <div class="p-6">
    <a
      href={baseUrl}
      class="flex items-center gap-3 text-2xl font-bold hover:text-primary transition-all duration-300 group"
      onclick={closeMobileMenu}
    >
      <div class="relative w-8 h-8 flex-shrink-0">
        <div
          class="absolute inset-0 bg-primary/30 group-hover:bg-primary rounded-full blur-md transition-all duration-300"
        ></div>
        <img
          src="{baseUrl}/noctua.png"
          alt="Noctua Logo"
          class="relative w-full h-full object-contain"
        />
      </div>
      <span>Noctua</span>
    </a>
  </div>

  <div class="px-6 mb-6">
    <div class="relative">
      <input
        type="text"
        placeholder="Search articles..."
        class="input w-full pl-10 h-10 bg-base-100"
        bind:value={searchQuery}
        oninput={updateSearch}
      />
      <span
        class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
        >🔍</span
      >
    </div>
  </div>

  <nav class="flex-1 overflow-y-auto px-4 pb-6">
    <div class="space-y-2">
      <div class="space-y-1">
        <a
          href={baseUrl}
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all
            {activeId === 'home' && !selectedSectionId
            ? 'bg-primary text-primary-content font-semibold shadow-md'
            : 'hover:bg-base-300 text-base-content/80'}"
          onclick={closeMobileMenu}
        >
          <span class="text-xl">🏠</span>
          <span class="flex-1">Home</span>
        </a>

        {#if activeId === "home" && !selectedSectionId && currentFeeds.length > 0}
          <div class="ml-4 pl-4 border-l-2 border-primary/20 space-y-1 my-2">
            {#each currentFeeds as feed}
              <label
                class="flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-base-300/50
                {!hiddenFeeds.has(feed.id)
                  ? 'text-base-content/80'
                  : 'text-base-content/40'}"
              >
                <input
                  type="checkbox"
                  class="toggle toggle-xs toggle-primary"
                  checked={!hiddenFeeds.has(feed.id)}
                  onchange={() => toggleFeed(feed.id)}
                />
                <span class="text-xs truncate flex-1" title={feed.name}>
                  {feed.name}
                </span>
              </label>
            {/each}
          </div>
        {/if}
      </div>

      {#if isLoggedIn}
        {#each sections as section}
          <div class="space-y-1">
            <a
              href={sectionHref(section.id)}
              class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                {activeId === 'home' && selectedSectionId === section.id
                ? 'bg-primary text-primary-content font-semibold shadow-md'
                : 'hover:bg-base-300 text-base-content/80'}"
              onclick={closeMobileMenu}
            >
              <span class="text-xl">{section.icon}</span>
              <span class="flex-1 truncate">{section.name}</span>
            </a>

            {#if activeId === "home" && selectedSectionId === section.id && currentFeeds.length > 0}
              <div
                class="ml-4 pl-4 border-l-2 border-primary/20 space-y-1 my-2"
              >
                {#each currentFeeds as feed}
                  <label
                    class="flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer transition-colors hover:bg-base-300/50
                    {!hiddenFeeds.has(feed.id)
                      ? 'text-base-content/80'
                      : 'text-base-content/40'}"
                  >
                    <input
                      type="checkbox"
                      class="toggle toggle-xs toggle-primary"
                      checked={!hiddenFeeds.has(feed.id)}
                      onchange={() => toggleFeed(feed.id)}
                    />
                    <span class="text-xs truncate flex-1" title={feed.name}>
                      {feed.name}
                    </span>
                  </label>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </nav>

  <div class="p-4 border-t border-base-300">
    <a
      href={settingsHref()}
      class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all
        {activeId === 'settings'
        ? 'bg-primary text-primary-content font-semibold shadow-md'
        : 'hover:bg-base-300 text-base-content/80'}"
      onclick={closeMobileMenu}
    >
      <span class="text-xl">⚙️</span>
      <span>Settings</span>
    </a>
  </div>
</aside>
