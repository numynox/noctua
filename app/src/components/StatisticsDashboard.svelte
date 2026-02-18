<script lang="ts">
  import { onMount } from "svelte";
  import {
    fetchArticleCountForUser,
    fetchArticleTotalsByFeedForUser,
    fetchReadStatisticsForUser,
    getLoginHref,
    getSession,
    onAuthStateChange,
    type FeedArticleTotalRecord,
    type ReadStatisticsRecord,
  } from "../lib/data";
  import FeedReadsBarChart from "./statistics/FeedReadsBarChart.svelte";
  import ReadHeatmap, {
    type HeatmapWeek,
  } from "./statistics/ReadHeatmap.svelte";
  import SummaryCards from "./statistics/SummaryCards.svelte";
  import WeekdayAverageBarChart from "./statistics/WeekdayAverageBarChart.svelte";

  let isLoading = $state(true);
  let isLoggedIn = $state(false);
  let errorMessage = $state("");
  let loginHref = $state("/login");
  let userId = $state("");

  let statisticsWeeks = $state(8);
  let heatmapWeeks = $state(52);

  let records = $state<ReadStatisticsRecord[]>([]);
  let totalArticleCount = $state(0);
  let thisWeekArticleCount = $state(0);
  let windowArticleCount = $state(0);
  let feedArticleTotals = $state<FeedArticleTotalRecord[]>([]);

  function startOfWeekMonday(input: Date): Date {
    const date = new Date(input);
    const day = date.getDay();
    const offset = (day + 6) % 7;
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    return date;
  }

  function addDays(input: Date, days: number): Date {
    const date = new Date(input);
    date.setDate(date.getDate() + days);
    return date;
  }

  function toDateKey(input: Date): string {
    const year = input.getFullYear();
    const month = String(input.getMonth() + 1).padStart(2, "0");
    const day = String(input.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function weekdayIndexMonday(input: Date): number {
    return (input.getDay() + 6) % 7;
  }

  async function refreshStatistics() {
    isLoading = true;
    errorMessage = "";

    try {
      const session = await getSession();
      if (!session?.user) {
        isLoggedIn = false;
        window.location.replace(loginHref);
        return;
      }

      userId = session.user.id;
      isLoggedIn = true;

      const currentWeekStart = startOfWeekMonday(new Date());
      const windowStart = addDays(currentWeekStart, -(statisticsWeeks - 1) * 7);
      const currentWeekStartIso = currentWeekStart.toISOString();
      const windowStartIso = windowStart.toISOString();

      const [
        readRecords,
        totalArticles,
        thisWeekArticles,
        windowArticles,
        perFeedTotals,
      ] = await Promise.all([
        fetchReadStatisticsForUser(userId),
        fetchArticleCountForUser(userId),
        fetchArticleCountForUser(userId, currentWeekStartIso),
        fetchArticleCountForUser(userId, windowStartIso),
        fetchArticleTotalsByFeedForUser(userId, windowStartIso),
      ]);

      records = readRecords;
      totalArticleCount = totalArticles;
      thisWeekArticleCount = thisWeekArticles;
      windowArticleCount = windowArticles;
      feedArticleTotals = perFeedTotals;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errorMessage = message;
      records = [];
      totalArticleCount = 0;
      thisWeekArticleCount = 0;
      windowArticleCount = 0;
      feedArticleTotals = [];
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    if (typeof document !== "undefined") {
      const baseUrl = document.documentElement.dataset.baseUrl || "/";
      loginHref = getLoginHref(baseUrl);

      const parsedStatisticsWeeks = Number(
        document.documentElement.dataset.statisticsWeeks,
      );
      statisticsWeeks =
        Number.isInteger(parsedStatisticsWeeks) && parsedStatisticsWeeks > 0
          ? parsedStatisticsWeeks
          : 8;

      const parsedHeatmapWeeks = Number(
        document.documentElement.dataset.statisticsHeatmapWeeks,
      );
      heatmapWeeks =
        Number.isInteger(parsedHeatmapWeeks) && parsedHeatmapWeeks > 0
          ? parsedHeatmapWeeks
          : 52;
    }

    refreshStatistics();

    const { data } = onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        window.location.replace(loginHref);
        return;
      }

      refreshStatistics();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  });

  let totalReadCount = $derived.by(() => records.length);

  let thisWeekReadCount = $derived.by(() => {
    const start = startOfWeekMonday(new Date());
    return records.filter((record) => new Date(record.readAt) >= start).length;
  });

  let averagePerWeek = $derived.by(() => {
    const currentWeekStart = startOfWeekMonday(new Date());
    const windowStart = addDays(currentWeekStart, -(statisticsWeeks - 1) * 7);
    const count = records.filter(
      (record) => new Date(record.readAt) >= windowStart,
    ).length;
    return count / statisticsWeeks;
  });

  let averageArticlesPerWeek = $derived.by(
    () => windowArticleCount / statisticsWeeks,
  );

  let feedReadEntries = $derived.by(() => {
    const currentWeekStart = startOfWeekMonday(new Date());
    const windowStart = addDays(currentWeekStart, -(statisticsWeeks - 1) * 7);

    const counts = new Map<string, number>();

    for (const record of records) {
      const readDate = new Date(record.readAt);
      if (readDate < windowStart) continue;

      const label = record.feedName || "Unknown feed";
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    const totalMap = new Map(
      feedArticleTotals.map((item) => [item.feedName, item.count]),
    );

    return Array.from(counts.entries())
      .map(([label, count]) => {
        const totalCount = totalMap.get(label) || 0;
        const readSharePercent =
          totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

        return {
          label,
          count,
          totalCount,
          readSharePercent,
        };
      })
      .sort((a, b) => b.count - a.count);
  });

  let weekdayAverages = $derived.by(() => {
    const counts = Array.from({ length: 7 }, () => 0);
    const currentWeekStart = startOfWeekMonday(new Date());
    const windowStart = addDays(currentWeekStart, -(statisticsWeeks - 1) * 7);

    for (const record of records) {
      const date = new Date(record.readAt);
      if (date < windowStart) continue;
      counts[weekdayIndexMonday(date)] += 1;
    }

    return counts.map((count) => count / statisticsWeeks);
  });

  let heatmapData = $derived.by(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentWeekStart = startOfWeekMonday(today);
    const firstWeekStart = addDays(currentWeekStart, -(heatmapWeeks - 1) * 7);

    const dayCounts = new Map<string, number>();
    for (const record of records) {
      const date = new Date(record.readAt);
      date.setHours(0, 0, 0, 0);

      if (date < firstWeekStart || date > today) continue;
      const key = toDateKey(date);
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    }

    const weeks: HeatmapWeek[] = [];
    let maxCount = 0;

    for (let weekIndex = 0; weekIndex < heatmapWeeks; weekIndex += 1) {
      const weekStart = addDays(firstWeekStart, weekIndex * 7);
      const cells = [];

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const date = addDays(weekStart, dayIndex);
        const dateKey = toDateKey(date);
        const isFuture = date > today;
        const count = isFuture ? 0 : dayCounts.get(dateKey) || 0;
        maxCount = Math.max(maxCount, count);

        cells.push({ dateKey, count, isFuture });
      }

      const weekLabel = weekStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      weeks.push({ weekLabel, cells });
    }

    return {
      weeks,
      maxCount,
    };
  });
</script>

{#if isLoading}
  <div class="flex items-center justify-center py-20">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else if errorMessage}
  <div class="alert alert-error max-w-3xl mx-auto">
    <span>{errorMessage}</span>
  </div>
{:else if !isLoggedIn}
  <div class="flex items-center justify-center py-20">
    <span class="loading loading-spinner loading-lg"></span>
  </div>
{:else}
  <div class="max-w-6xl mx-auto space-y-6">
    <SummaryCards
      {totalReadCount}
      {totalArticleCount}
      {thisWeekReadCount}
      thisWeekTotalCount={thisWeekArticleCount}
      {averagePerWeek}
      averageTotalPerWeek={averageArticlesPerWeek}
      {statisticsWeeks}
    />

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <FeedReadsBarChart entries={feedReadEntries} />
      <WeekdayAverageBarChart {weekdayAverages} />
    </div>

    <ReadHeatmap weeks={heatmapData.weeks} maxCount={heatmapData.maxCount} />
  </div>
{/if}
