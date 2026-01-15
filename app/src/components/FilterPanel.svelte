<script lang="ts">
  import { onMount } from "svelte";
  import {
    getFilters,
    setFilters,
    resetFilters,
    getPreferences,
    setPreferences,
    clearReadHistory,
  } from "../lib/storage";
  import type { Section } from "../lib/data";

  interface Props {
    sections: Section[];
  }

  let { sections }: Props = $props();

  let searchQuery = $state("");
  let dateRange = $state<"all" | "today" | "week" | "month">("all");
  let showReadArticles = $state(true);
  let compactView = $state(false);

  onMount(() => {
    const filters = getFilters();
    const prefs = getPreferences();

    searchQuery = filters.searchQuery;
    dateRange = filters.dateRange;
    showReadArticles = prefs.showReadArticles;
    compactView = prefs.compactView;
  });

  function updateFilters() {
    setFilters({ searchQuery, dateRange });

    window.dispatchEvent(
      new CustomEvent("filtersChanged", {
        detail: { searchQuery, dateRange },
      })
    );
  }

  function updatePreferences() {
    setPreferences({ showReadArticles, compactView });

    window.dispatchEvent(
      new CustomEvent("preferencesChanged", {
        detail: { showReadArticles, compactView },
      })
    );
  }

  function handleReset() {
    resetFilters();
    searchQuery = "";
    dateRange = "all";
    updateFilters();
  }

  function handleClearHistory() {
    if (confirm("Clear all read article history?")) {
      clearReadHistory();
      window.dispatchEvent(new CustomEvent("readHistoryCleared"));
    }
  }
</script>

<div class="card bg-base-200">
  <div class="card-body p-4">
    <h3 class="font-semibold text-sm uppercase tracking-wide text-base-content/70 mb-3">
      Filters
    </h3>

    <!-- Search -->
    <div class="form-control mb-3">
      <input
        type="text"
        placeholder="Search articles..."
        class="input input-sm input-bordered w-full"
        bind:value={searchQuery}
        oninput={updateFilters}
      />
    </div>

    <!-- Date range -->
    <div class="form-control mb-3">
      <label class="label py-1">
        <span class="label-text text-xs">Time Range</span>
      </label>
      <select
        class="select select-sm select-bordered w-full"
        bind:value={dateRange}
        onchange={updateFilters}
      >
        <option value="all">All time</option>
        <option value="today">Today</option>
        <option value="week">This week</option>
        <option value="month">This month</option>
      </select>
    </div>

    <!-- Preferences -->
    <div class="divider my-2 text-xs">Display</div>

    <label class="label cursor-pointer py-1">
      <span class="label-text text-sm">Show read articles</span>
      <input
        type="checkbox"
        class="toggle toggle-sm toggle-primary"
        bind:checked={showReadArticles}
        onchange={updatePreferences}
      />
    </label>

    <label class="label cursor-pointer py-1">
      <span class="label-text text-sm">Compact view</span>
      <input
        type="checkbox"
        class="toggle toggle-sm toggle-primary"
        bind:checked={compactView}
        onchange={updatePreferences}
      />
    </label>

    <!-- Actions -->
    <div class="divider my-2"></div>

    <div class="flex flex-col gap-2">
      <button class="btn btn-sm btn-ghost" onclick={handleReset}>
        Reset Filters
      </button>
      <button class="btn btn-sm btn-ghost text-warning" onclick={handleClearHistory}>
        Clear Read History
      </button>
    </div>
  </div>
</div>
