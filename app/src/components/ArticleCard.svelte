<script lang="ts">
  import type { Article } from "../lib/types";

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

  function handleCardClick() {
    onArticleClick();
    // Navigate after marking as read
    window.open(article.url, "_blank", "noopener,noreferrer");
  }
</script>

<div
  class="card bg-base-200 cursor-pointer transition-all rounded-lg hover:outline hover:outline-2 hover:outline-primary"
  class:opacity-60={isRead || isSeen}
  class:grayscale-25={isRead || isSeen}
  onclick={handleCardClick}
>
  {#if article.image_url}
    <figure>
      <img
        src={article.image_url}
        alt=""
        class="h-30 md:h-40 lg:h-50 w-full object-cover bg-base-300"
        loading="lazy"
        onerror={handleImageError}
      />
    </figure>
  {/if}
  <div class="card-body p-4">
    <div class="text-xs text-base-content/60 flex flex-wrap gap-2">
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

    <h3 class="card-title text-lg font-bold">
      {article.title}
    </h3>

    <p class="text-sm text-base-content/80 line-clamp-3">
      {article.summary || ""}
    </p>

    {#if readTimestamp || (article.tags && article.tags.length > 0)}
      <div class="flex flex-wrap gap-1">
        {#if readTimestamp}
          <span class="badge badge-primary badge-xs"
            >{formatReadTimestamp(readTimestamp)}</span
          >
        {/if}
        {#if article.tags && article.tags.length > 0}
          {#each article.tags.slice(0, 3) as tag}
            <span class="badge badge-outline badge-xs">{tag}</span>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</div>
