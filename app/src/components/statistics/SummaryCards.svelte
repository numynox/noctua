<script lang="ts">
  interface Props {
    totalReadCount: number;
    totalArticleCount: number;
    thisWeekReadCount: number;
    thisWeekTotalCount: number;
    averagePerWeek: number;
    averageTotalPerWeek: number;
  }

  let {
    totalReadCount,
    totalArticleCount,
    thisWeekReadCount,
    thisWeekTotalCount,
    averagePerWeek,
    averageTotalPerWeek,
  }: Props = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div class="card bg-base-200 shadow-sm">
    <div class="card-body p-5">
      <p class="text-sm text-base-content/70">Total read</p>
      <p class="text-3xl font-bold">
        {totalReadCount} articles
      </p>
      <p class="text-sm text-base-content/70">
        out of {totalArticleCount} articles published.
      </p>
    </div>
  </div>

  <div class="card bg-base-200 shadow-sm">
    <div class="card-body p-5">
      <p class="text-sm text-base-content/70">Read this week</p>
      <p class="text-3xl font-bold">
        {thisWeekReadCount} articles
      </p>
      <p class="text-sm text-base-content/70">
        out of {thisWeekTotalCount} articles published this week.
      </p>
    </div>
  </div>

  <div class="card bg-base-200 shadow-sm">
    <div class="card-body p-5">
      <p class="text-sm text-base-content/70">Average read per week</p>
      <p class="text-3xl font-bold">
        {averagePerWeek.toFixed(1)} articles
      </p>
      <p class="text-sm text-base-content/70">
        out of {averageTotalPerWeek.toFixed(1)} articles published per week.
      </p>
    </div>
  </div>
</div>
