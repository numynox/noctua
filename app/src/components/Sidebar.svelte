<script lang="ts">
  import { onMount } from "svelte";
  import type { Section } from "../lib/data";
  import {
    getFilters,
    getHiddenFeeds,
    setFilters,
    toggleFeedVisibility,
  } from "../lib/storage";

  interface Props {
    sections: Section[];
    activeId?: string; // 'home', 'settings', or section id
    processedAt?: string;
  }

  let { sections, activeId = "home", processedAt }: Props = $props();

  function getRelativeTime(dateString?: string) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "yesterday";
    return `${diffInDays} days ago`;
  }

  let searchQuery = $state("");
  let isMobileMenuOpen = $state(false);
  let hiddenFeeds = $state<Set<string>>(new Set());

  // Determine which feeds to show in the sidebar for the active section
  let currentFeeds = $derived.by(() => {
    if (activeId === "home") {
      return sections.flatMap((s) => s.feeds);
    }
    const section = sections.find((s) => s.id === activeId);
    return section ? section.feeds : [];
  });

  onMount(() => {
    const filters = getFilters();
    searchQuery = filters.searchQuery || "";
    hiddenFeeds = getHiddenFeeds();

    // Listen for search changes from other components
    window.addEventListener("filtersChanged", ((e: CustomEvent) => {
      searchQuery = e.detail.searchQuery;
    }) as EventListener);
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
    toggleFeedVisibility(feedId);
    hiddenFeeds = getHiddenFeeds();
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
</script>

<!-- Mobile Toggle Button -->
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

<!-- Backdrop -->
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

<!-- Sidebar Container -->
<aside
  class="fixed lg:sticky top-0 left-0 z-40 w-80 h-screen bg-base-200 border-r border-base-300 transform transition-transform duration-300 ease-in-out flex flex-col
    {isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
>
  <!-- Logo -->
  <div class="p-6">
    <a
      href="/"
      class="flex items-center gap-3 text-2xl font-bold hover:text-primary transition-colors"
      onclick={closeMobileMenu}
    >
      <span>🦉</span>
      <span>Noctua</span>
    </a>
  </div>

  <!-- Search -->
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

  <!-- Navigation -->
  <nav class="flex-1 overflow-y-auto px-4 pb-6 custom-scrollbar">
    <div class="space-y-2">
      <!-- Transition wrapper for each main link to allow for sub-items -->

      <!-- Home Link + Toggles -->
      <div class="space-y-1">
        <a
          href="/"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all
            {activeId === 'home'
            ? 'bg-primary text-primary-content font-semibold shadow-md'
            : 'hover:bg-base-300 text-base-content/80'}"
          onclick={closeMobileMenu}
        >
          <span class="text-xl">🏠</span>
          <span class="flex-1">Home</span>
        </a>

        {#if activeId === "home" && currentFeeds.length > 0}
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
                <span class="text-[10px] opacity-40 font-mono">
                  {feed.articles.length}
                </span>
              </label>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Sections Loop -->
      {#each sections as section}
        <div class="space-y-1">
          <a
            href={`/sections/${section.id}`}
            class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all
              {activeId === section.id
              ? 'bg-primary text-primary-content font-semibold shadow-md'
              : 'hover:bg-base-300 text-base-content/80'}"
            onclick={closeMobileMenu}
          >
            <span class="text-xl">{section.icon}</span>
            <span class="flex-1 truncate">{section.name}</span>
          </a>

          {#if activeId === section.id && currentFeeds.length > 0}
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
                  <span class="text-[10px] opacity-40 font-mono">
                    {feed.articles.length}
                  </span>
                </label>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </nav>

  {#if processedAt}
    <div class="px-6 py-2 mb-3">
      <div
        class="text-[10px] text-base-content/30 text-center uppercase tracking-wider"
      >
        Last updated {getRelativeTime(processedAt)}
      </div>
    </div>
  {/if}

  <!-- Bottom Links -->
  <div class="p-4 border-t border-base-300">
    <a
      href="/settings"
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

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: oklch(var(--bc) / 0.1);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: oklch(var(--bc) / 0.2);
  }
</style>
