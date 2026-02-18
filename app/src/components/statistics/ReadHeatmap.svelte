<script lang="ts">
  export interface HeatmapCell {
    dateKey: string;
    count: number;
    isFuture: boolean;
  }

  export interface HeatmapWeek {
    weekLabel: string;
    cells: HeatmapCell[];
  }

  interface Props {
    weeks: HeatmapWeek[];
    maxCount: number;
  }

  let { weeks, maxCount }: Props = $props();

  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  interface MonthSegment {
    label: string;
    span: number;
  }

  let monthSegments = $derived.by(() => {
    const segments: MonthSegment[] = [];

    for (const week of weeks) {
      const mondayKey = week.cells[0]?.dateKey;
      if (!mondayKey) continue;

      const mondayDate = new Date(`${mondayKey}T00:00:00`);
      const monthLabel = mondayDate.toLocaleDateString("en-US", {
        month: "long",
      });

      const previous = segments[segments.length - 1];
      if (previous && previous.label === monthLabel) {
        previous.span += 1;
      } else {
        segments.push({
          label: monthLabel,
          span: 1,
        });
      }
    }

    return segments;
  });

  function cellClass(cell: HeatmapCell): string {
    if (cell.isFuture) return "bg-base-300/40";
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
    {#if weeks.length === 0}
      <p class="text-sm text-base-content/70">No read activity yet.</p>
    {:else}
      <div class="overflow-x-auto">
        <div
          class="inline-grid gap-1"
          style={`grid-template-columns: auto repeat(${weeks.length}, minmax(0, 1fr));`}
        >
          <div></div>
          {#each monthSegments as segment}
            <div
              class="text-xs text-left text-base-content/70 truncate"
              style={`grid-column: span ${segment.span};`}
            >
              {segment.label}
            </div>
          {/each}

          {#each weekdayLabels as label, dayIndex}
            <div class="contents">
              <div class="text-xs pr-2 text-base-content/70 self-center">
                {label}
              </div>
              {#each weeks as week}
                {@const cell = week.cells[dayIndex]}
                <div
                  class={`w-3.5 h-3.5 rounded-sm border border-base-100 ${cellClass(cell)}`}
                  title={`${cell.dateKey}: ${cell.count} read`}
                  aria-label={`${cell.dateKey}: ${cell.count} read`}
                ></div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</section>
