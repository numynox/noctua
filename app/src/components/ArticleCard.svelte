<script lang="ts">
  import type { Article } from "../lib/data";

  interface Props {
    article: Article;
    isRead: boolean;
    compactView: boolean;
    onArticleClick: () => void;
  }

  let { article, isRead, compactView, onArticleClick }: Props = $props();

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "";

    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }

  function handleClick() {
    onArticleClick();
  }
</script>

<article
  class="card bg-base-200 article-card"
  class:article-read={isRead}
  class:card-compact={compactView}
>
  <div class="card-body" class:p-3={compactView} class:p-4={!compactView}>
    <!-- Header -->
    <div class="flex items-start gap-2">
      <div class="flex-1">
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          class="card-title text-base hover:text-primary transition-colors"
          class:text-sm={compactView}
          onclick={handleClick}
        >
          {article.title}
          {#if isRead}
            <span class="badge badge-ghost badge-sm">Read</span>
          {/if}
        </a>

        <div class="flex items-center gap-2 text-xs text-base-content/60 mt-1">
          <span>{article.feed_name}</span>
          {#if article.published}
            <span>•</span>
            <time datetime={article.published}>
              {formatDate(article.published)}
            </time>
          {/if}
          {#if article.author}
            <span>•</span>
            <span>{article.author}</span>
          {/if}
        </div>
      </div>

      <!-- Image Preview -->
      {#if !compactView && article.image_url}
        <div class="flex-none ml-2">
          <img
            src={article.image_url}
            alt=""
            class="w-24 h-24 object-cover rounded-md bg-base-300"
            loading="lazy"
            onerror={(e) =>
              ((e.target as HTMLImageElement).style.display = "none")}
          />
        </div>
      {/if}
    </div>

    <!-- Summary -->
    {#if !compactView}
      <p class="text-sm text-base-content/80 line-clamp-3">
        {article.summary || ""}
      </p>

      <!-- Tags -->
      {#if article.tags && article.tags.length > 0}
        <div class="flex flex-wrap gap-1 mt-2">
          {#each article.tags.slice(0, 3) as tag}
            <span class="badge badge-outline badge-xs">{tag}</span>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- Actions -->
    <div class="card-actions justify-end mt-2">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary btn-xs"
        onclick={handleClick}
      >
        Read →
      </a>
    </div>
  </div>
</article>

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
