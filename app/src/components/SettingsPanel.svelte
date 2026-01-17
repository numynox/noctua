<script lang="ts">
  import { onMount } from "svelte";
  import {
    clearReadHistory,
    clearSeenHistory,
    getPreferences,
    getTheme,
    setPreferences,
    setTheme,
  } from "../lib/storage";

  let showReadArticles = $state(true);
  let autoMarkAsSeen = $state(true);
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
    showReadArticles = prefs.hideSeenArticles; // Note: inverted logic
    autoMarkAsSeen = prefs.autoMarkAsSeen;
    currentTheme = getTheme();
  });

  function updatePreferences() {
    setPreferences({
      hideSeenArticles: showReadArticles,
      autoMarkAsSeen,
    });
    window.dispatchEvent(
      new CustomEvent("preferencesChanged", {
        detail: {
          hideSeenArticles: showReadArticles,
          autoMarkAsSeen,
        },
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
      // Clear both read and seen history so hidden articles reappear.
      // `storage.ts` dispatches the appropriate events, so no need to
      // dispatch them here.
      clearReadHistory();
      clearSeenHistory();
      alert("Read and seen history cleared.");
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
              <span class="text-sm font-medium text-base-content/70 block"
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
            <span class="font-semibold block">Hide Seen Articles</span>
            <span class="text-sm text-base-content/60"
              >Read or seen articles will be hidden on next page load</span
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
            <span class="font-semibold block">Auto-Mark as Seen</span>
            <span class="text-sm text-base-content/60"
              >Automatically mark articles as seen when scrolled past</span
            >
          </div>
          <input
            type="checkbox"
            class="toggle toggle-primary"
            bind:checked={autoMarkAsSeen}
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
