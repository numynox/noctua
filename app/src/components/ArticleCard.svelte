<script lang="ts">
  import type { Article } from "../lib/data";

  interface Props {
    article: Article;
    isRead: boolean;
    isSeen: boolean;
    readTimestamp: string | null;
    onArticleClick: () => void;
  }

  let { article, isRead, isSeen, readTimestamp, onArticleClick }: Props =
    $props();

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

  function formatReadTimestamp(timestamp: string | null): string {
    if (!timestamp || !isRead) return "";

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) return "Read today";
    if (diffDays === 1) return "Read yesterday";
    if (diffDays < 7) return `Read ${diffDays} days ago`;
    if (diffHours < 24 * 30)
      return `Read ${Math.floor(diffHours / 24)} days ago`;

    return `Read ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  function handleImageError(e: Event) {
    const target = e.target as HTMLImageElement;
    if (target) {
      target.style.display = "none";
    }
  }

  function handleClick(event: Event) {
    event.preventDefault();
    onArticleClick();
    // Navigate after marking as read
    window.open(article.url, "_blank", "noopener,noreferrer");
  }

  function handleCardClick() {
    onArticleClick();
    // Navigate after marking as read
    window.open(article.url, "_blank", "noopener,noreferrer");
  }
</script>

<article
  class="card bg-base-200 article-card cursor-pointer hover:outline hover:outline-2 hover:outline-primary transition-all"
  class:article-read={isRead}
  class:article-seen={isSeen}
  onclick={handleCardClick}
>
  <div class="card-body p-4">
    <!-- Header -->
    <div class="flex items-start gap-2">
      <div class="flex-1">
        <h3 class="card-title text-base transition-colors">
          {article.title}
        </h3>

        <div class="flex items-center gap-2 text-xs text-base-content/60 mt-1">
          {#if readTimestamp}
            <span class="badge badge-primary badge-xs"
              >{formatReadTimestamp(readTimestamp)}</span
            >
          {/if}
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
      {#if article.image_url}
        <div class="flex-none ml-2">
          <img
            src={article.image_url}
            alt=""
            class="w-24 h-24 object-cover rounded-md bg-base-300"
            loading="lazy"
            onerror={handleImageError}
          />
        </div>
      {/if}
    </div>

    <!-- Summary -->
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
  </div>
</article>

<style>
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .article-read {
    opacity: 0.6;
    filter: grayscale(0.3);
  }

  .article-seen {
    opacity: 0.6;
    filter: grayscale(0.2);
  }
</style>
