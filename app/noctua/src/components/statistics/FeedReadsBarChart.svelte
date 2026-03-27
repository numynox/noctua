<script lang="ts">
  interface FeedReadEntry {
    label: string;
    count: number;
    totalCount: number;
    readSharePercent: number;
  }

  interface Props {
    entries: FeedReadEntry[];
  }

  let { entries }: Props = $props();

  let visibleEntries = $derived.by(() => entries.slice(0, 7));

  let maxCount = $derived.by(() => {
    const counts = visibleEntries.map((entry) => entry.count);
    return counts.length ? Math.max(...counts) : 1;
  });
</script>

<section class="card bg-base-200 shadow-sm">
  <div class="card-body p-6">
    {#if visibleEntries.length === 0}
      <p class="text-sm text-base-content/70">No read articles yet.</p>
    {:else}
      <div class="space-y-3 max-h-[28rem] overflow-auto pr-1">
        {#each visibleEntries as entry}
          <div>
            <div class="flex items-center justify-between gap-3 text-sm mb-1">
              <span class="truncate">{entry.label}</span>
              <div class="flex items-center gap-2">
                <span class="text-base-content/60"
                  >{entry.readSharePercent}% read</span
                >
                <span class="font-semibold">{entry.count} articles</span>
              </div>
            </div>
            <div class="w-full h-3 bg-base-300 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary rounded-full"
                style={`width: ${(entry.count / maxCount) * 100}%`}
              ></div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</section>
