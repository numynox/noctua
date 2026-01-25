<script lang="ts">
  import { marked } from "marked";

  interface Props {
    summary: string | null;
    icon?: string;
    baseUrl?: string;
  }

  let { summary, icon = "✨", baseUrl = "" }: Props = $props();

  let summaryHtml = $derived(summary ? marked.parse(summary) : "");
  let isOwlIcon = $derived(icon === "🦉");
</script>

{#if summary}
  <div
    class="card bg-primary/5 border border-primary/20 mb-8 relative overflow-hidden group"
  >
    <div
      class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
    >
      {#if isOwlIcon}
        <div class="relative w-16 h-16">
          <div
            class="absolute inset-0 bg-primary/30 rounded-full blur-lg"
          ></div>
          <img
            src="{baseUrl}/noctua.png"
            alt="Noctua"
            class="relative w-full h-full object-contain"
          />
        </div>
      {:else}
        <span class="text-6xl">{icon}</span>
      {/if}
    </div>
    <div class="card-body p-6 lg:p-8">
      <div
        class="prose prose-md max-w-none text-base-content/90 prose-p:leading-relaxed prose-headings:text-primary"
      >
        {@html summaryHtml}
      </div>
    </div>
  </div>
{/if}
