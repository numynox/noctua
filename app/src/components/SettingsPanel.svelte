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
  let currentTheme = $state<"light" | "dark" | "auto">("auto");

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
      })
    );
  }

  function handleThemeChange(theme: "light" | "dark" | "auto") {
    currentTheme = theme;
    setTheme(theme);
  }

  function handleClearHistory() {
    if (
      confirm(
        "Are you sure you want to clear your read article history? This cannot be undone."
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
        <label class="label p-0">
          <span class="label-text font-semibold">Color Theme</span>
        </label>
        <div class="grid grid-cols-3 gap-3">
          {#each ["light", "dark", "auto"] as theme}
            <button
              onclick={() => handleThemeChange(theme as any)}
              class="btn btn-outline btn-md capitalize {currentTheme === theme
                ? 'btn-primary'
                : ''}"
            >
              {theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "🔄"}
              {theme}
            </button>
          {/each}
        </div>
      </div>

      <div class="divider"></div>

      <!-- Display Toggles -->
      <div class="space-y-4">
        <label class="label cursor-pointer p-0">
          <div>
            <span class="label-text font-semibold block">Compact View</span>
            <span class="label-text-alt text-base-content/60"
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

        <label class="label cursor-pointer p-0">
          <div>
            <span class="label-text font-semibold block"
              >Show Read Articles</span
            >
            <span class="label-text-alt text-base-content/60"
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

        <label class="label cursor-pointer p-0">
          <div>
            <span class="label-text font-semibold block">Show Summaries</span>
            <span class="label-text-alt text-base-content/60"
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
