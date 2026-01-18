<script lang="ts">
  import { marked } from "marked";

  interface Props {
    summary: string | null;
    icon?: string;
  }

  let { summary, icon = "✨" }: Props = $props();

  let summaryHtml = $derived(summary ? marked.parse(summary) : "");
</script>

{#if summary}
  <div
    class="card bg-primary/5 border border-primary/20 mb-8 relative overflow-hidden group"
  >
    <div
      class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
    >
      <span class="text-6xl">{icon}</span>
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
