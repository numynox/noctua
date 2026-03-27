<script lang="ts">
  interface Props {
    weekdayAverages: number[];
  }

  let { weekdayAverages }: Props = $props();

  const labels = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  let maxValue = $derived.by(() => {
    return weekdayAverages.length ? Math.max(...weekdayAverages, 0.1) : 1;
  });
</script>

<section class="card bg-base-200 shadow-sm">
  <div class="card-body p-6">
    <div class="space-y-3">
      {#each labels as label, index}
        <div>
          <div class="flex items-center justify-between text-sm mb-1">
            <span>{label}</span>
            <span class="font-semibold"
              >{weekdayAverages[index].toFixed(1)} articles</span
            >
          </div>
          <div class="w-full h-3 bg-base-300 rounded-full overflow-hidden">
            <div
              class="h-full bg-secondary rounded-full"
              style={`width: ${(weekdayAverages[index] / maxValue) * 100}%`}
            ></div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>
