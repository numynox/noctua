<script lang="ts">
  import { onMount } from "svelte";
  import {
    clearReadHistory,
    getPreferences,
    getTheme,
    setPreferences,
    setTheme,
  } from "../lib/storage";

  let showReadArticles = $state(true);
  let compactView = $state(false);
  let showSummaries = $state(true);
  let currentTheme = $state<string>("auto");

  // All daisyUI themes
  const daisyThemes = [
    "light",
    "dark",
    "cupcake",
    "bumblebee",
    "emerald",
    "corporate",
    "synthwave",
    "retro",
    "cyberpunk",
    "valentine",
    "halloween",
    "garden",
    "forest",
    "aqua",
    "lofi",
    "pastel",
    "fantasy",
    "wireframe",
    "black",
    "luxury",
    "dracula",
    "cmyk",
    "autumn",
    "business",
    "acid",
    "lemonade",
    "night",
    "coffee",
    "winter",
    "dim",
    "nord",
    "sunset",
  ];

  onMount(() => {
    const prefs = getPreferences();
    showReadArticles = prefs.showReadArticles;
    compactView = prefs.compactView;
    showSummaries = prefs.showSummaries;
    currentTheme = getTheme();
  });

  function updatePreferences() {
    setPreferences({ showReadArticles, compactView, showSummaries });
    window.dispatchEvent(
      new CustomEvent("preferencesChanged", {
        detail: { showReadArticles, compactView, showSummaries },
      }),
    );
  }

  function handleThemeChange(theme: string) {
    currentTheme = theme;
    setTheme(theme);
  }

  function handleClearHistory() {
    if (
      confirm(
        "Are you sure you want to clear your read article history? This cannot be undone.",
      )
    ) {
      clearReadHistory();
      window.dispatchEvent(new CustomEvent("readHistoryCleared"));
      alert("Read history cleared.");
    }
  }
</script>

<div class="max-w-2xl mx-auto space-y-8">
  <section class="card bg-base-200 shadow-sm overflow-hidden">
    <div class="card-body p-6 lg:p-8">
      <h2 class="text-xl font-bold mb-6 flex items-center gap-2">
        <span>🎨</span> Appearance
      </h2>

      <!-- Theme Selection -->
      <div class="space-y-4">
        <div class="font-semibold text-sm">Color Theme</div>

        <!-- Auto Theme Toggle -->
        <div class="space-y-2">
          <label class="flex items-center justify-between gap-4 cursor-pointer">
            <div class="flex-1">
              <span class="font-medium text-base-content/70 block"
                >Auto Theme</span
              >
              <span class="text-sm text-base-content/60"
                >Automatically switch between light and dark based on system
                preference</span
              >
            </div>
            <input
              type="checkbox"
              class="toggle toggle-primary"
              checked={currentTheme === "auto"}
              onchange={() =>
                handleThemeChange(currentTheme === "auto" ? "light" : "auto")}
            />
          </label>
        </div>

        <!-- Theme Grid -->
        <div class="space-y-2">
          <div class="text-sm font-medium text-base-content/70">
            Select Theme
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {#each daisyThemes as theme}
              <button
                onclick={() => handleThemeChange(theme)}
                disabled={currentTheme === "auto"}
                class="btn btn-sm capitalize {currentTheme === theme
                  ? 'btn-primary'
                  : 'btn-soft'} {currentTheme === 'auto' ? 'btn-disabled' : ''}"
              >
                {theme}
              </button>
            {/each}
          </div>
          {#if currentTheme === "auto"}
            <p class="text-xs text-base-content/50">
              Theme selection is disabled when Auto is active
            </p>
          {/if}
        </div>
      </div>

      <div class="divider"></div>

      <!-- Display Toggles -->
      <div class="space-y-4">
        <label class="flex items-center justify-between gap-4 cursor-pointer">
          <div class="flex-1">
            <span class="font-semibold block">Compact View</span>
            <span class="text-sm text-base-content/60"
              >Show more articles with less detail</span
            >
          </div>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            bind:checked={compactView}
            onchange={updatePreferences}
          />
        </label>

        <label class="flex items-center justify-between gap-4 cursor-pointer">
          <div class="flex-1">
            <span class="font-semibold block">Show Read Articles</span>
            <span class="text-sm text-base-content/60"
              >Keep articles in the list after reading them</span
            >
          </div>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            bind:checked={showReadArticles}
            onchange={updatePreferences}
          />
        </label>

        <label class="flex items-center justify-between gap-4 cursor-pointer">
          <div class="flex-1">
            <span class="font-semibold block">Show Summaries</span>
            <span class="text-sm text-base-content/60"
              >Display AI-generated summaries for articles</span
            >
          </div>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            bind:checked={showSummaries}
            onchange={updatePreferences}
          />
        </label>
      </div>
    </div>
  </section>

  <section class="card bg-base-200 shadow-sm border border-error/20">
    <div class="card-body p-6 lg:p-8">
      <h2 class="text-xl font-bold text-error mb-4 flex items-center gap-2">
        <span>⚠️</span> Danger Zone
      </h2>
      <p class="text-sm text-base-content/70 mb-6">
        Once you clear your read history, you cannot recover it. This will mark
        all articles as unread.
      </p>
      <button
        class="btn btn-error btn-outline w-full"
        onclick={handleClearHistory}
      >
        Clear Read History
      </button>
    </div>
  </section>
</div>
