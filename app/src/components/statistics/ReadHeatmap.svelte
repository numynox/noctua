<script lang="ts">
  export interface HeatmapCell {
    hour: number;
    count: number;
  }

  export interface HeatmapDay {
    dayLabel: string;
    cells: HeatmapCell[];
  }

  interface Props {
    days: HeatmapDay[];
    maxCount: number;
  }

  let { days, maxCount }: Props = $props();

  const hourLabels = Array.from({ length: 24 }, (_, i) => i.toString());

  function cellClass(cell: HeatmapCell): string {
    if (cell.count === 0) return "bg-base-300";

    const ratio = maxCount > 0 ? cell.count / maxCount : 0;
    if (ratio <= 0.25) return "bg-primary/30";
    if (ratio <= 0.5) return "bg-primary/50";
    if (ratio <= 0.75) return "bg-primary/70";
    return "bg-primary";
  }
</script>

<section class="card bg-base-200 shadow-sm">
  <div class="card-body p-6">
    {#if days.length === 0}
      <p class="text-sm text-base-content/70">No read activity yet.</p>
    {:else}
      <div class="overflow-x-auto">
        <div
          class="inline-grid gap-1"
          style={`grid-template-columns: auto repeat(7, minmax(0, 1fr));`}
        >
          <div></div>
          {#each days as day}
            <div class="text-xs text-center text-base-content/70">
              {day.dayLabel}
            </div>
          {/each}

          {#each hourLabels as label, hourIndex}
            <div class="contents">
              <div class="text-xs pr-2 text-base-content/70 self-center">
                {label}
              </div>
              {#each days as day}
                {@const cell = day.cells[hourIndex]}
                <div
                  class={`w-5 h-5 rounded-sm border border-base-100 ${cellClass(cell)}`}
                  title={`${day.dayLabel} ${cell.hour}:00: ${cell.count} reads`}
                  aria-label={`${day.dayLabel} ${cell.hour}:00: ${cell.count} reads`}
                ></div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</section>
