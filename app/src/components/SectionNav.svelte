<script lang="ts">
  import { onMount } from "svelte";
  import type { Section } from "../lib/data";
  import { getHiddenSections, toggleSectionVisibility } from "../lib/storage";

  interface Props {
    sections: Section[];
  }

  let { sections }: Props = $props();

  let hiddenSections = $state<Set<string>>(new Set());

  onMount(() => {
    hiddenSections = getHiddenSections();
  });

  function toggleSection(sectionId: string) {
    toggleSectionVisibility(sectionId);
    hiddenSections = getHiddenSections();

    // Dispatch event for other components to react
    window.dispatchEvent(
      new CustomEvent("sectionsChanged", { detail: { hiddenSections } })
    );
  }

  function scrollToSection(sectionId: string) {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function getTotalArticles(section: Section): number {
    return section.feeds.reduce((sum, f) => sum + f.articles.length, 0);
  }
</script>

<div class="card bg-base-200 mb-3">
  <div class="card-body p-4">
    <h3
      class="font-semibold text-sm uppercase tracking-wide text-base-content/70 mb-3"
    >
      Sections
    </h3>

    <ul class="space-y-1">
      {#each sections as section}
        <li>
          <div class="flex items-center gap-2">
            <button
              onclick={() => toggleSection(section.id)}
              class="btn btn-ghost btn-xs btn-square"
              title={hiddenSections.has(section.id)
                ? "Show section"
                : "Hide section"}
            >
              {#if hiddenSections.has(section.id)}
                <span class="opacity-50">👁️‍🗨️</span>
              {:else}
                <span>👁️</span>
              {/if}
            </button>

            <button
              onclick={() => scrollToSection(section.id)}
              class="flex-1 text-left hover:text-primary transition-colors flex items-center gap-2"
              class:opacity-50={hiddenSections.has(section.id)}
            >
              <span>{section.icon}</span>
              <span class="flex-1">{section.name}</span>
              <span class="badge badge-sm badge-ghost">
                {getTotalArticles(section)}
              </span>
            </button>
          </div>
        </li>
      {/each}
    </ul>
  </div>
</div>
