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
  }

  let { sections, activeId = "home" }: Props = $props();

  let searchQuery = $state("");
  let isMobileMenuOpen = $state(false);
  let hiddenFeeds = $state<Set<string>>(new Set());

  // Determine which feeds to show in the sidebar
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
      })
    );
  }

  function toggleFeed(feedId: string) {
    toggleFeedVisibility(feedId);
    hiddenFeeds = getHiddenFeeds();
    window.dispatchEvent(
      new CustomEvent("feedsChanged", { detail: { hiddenFeeds } })
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
  class="fixed lg:static inset-y-0 left-0 z-40 w-80 bg-base-200 border-r border-base-300 transform transition-transform duration-300 ease-in-out flex flex-col
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
        class="input input-bordered w-full pl-10 h-10 bg-base-100"
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
    <div class="space-y-6">
      <!-- Main Menu -->
      <div class="space-y-1">
        <!-- Home -->
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

        <!-- Sections -->
        {#each sections as section}
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
        {/each}
      </div>

      <!-- Feed Visibility Toggles -->
      {#if activeId !== "settings" && currentFeeds.length > 0}
        <div class="px-2">
          <h3
            class="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-base-content/30 mb-3"
          >
            Feed Visibility
          </h3>
          <div class="space-y-1">
            {#each currentFeeds as feed}
              <label
                class="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-base-300/50
                {!hiddenFeeds.has(feed.id)
                  ? 'text-base-content/80'
                  : 'text-base-content/40'}"
              >
                <input
                  type="checkbox"
                  class="checkbox checkbox-xs checkbox-primary"
                  checked={!hiddenFeeds.has(feed.id)}
                  onchange={() => toggleFeed(feed.id)}
                />
                <span class="text-sm truncate flex-1" title={feed.name}>
                  {feed.name}
                </span>
                <span class="text-[10px] opacity-40 font-mono">
                  {feed.articles.length}
                </span>
              </label>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </nav>

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
