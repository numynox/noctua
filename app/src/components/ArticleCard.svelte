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

<button
  type="button"
  class="card bg-base-300 cursor-pointer transition-all rounded-lg hover:outline hover:outline-2 hover:outline-primary text-left w-full"
  class:opacity-60={isRead || isSeen}
  class:grayscale-25={isRead || isSeen}
  onclick={handleCardClick}
>
  {#if article.image_url}
    <figure class="relative">
      <img
        src={article.image_url}
        alt=""
        class="h-40 lg:h-50 w-full object-cover bg-base-300"
        loading="lazy"
        onerror={handleImageError}
      />
      <div
        class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-base-300 to-transparent"
      ></div>
    </figure>
  {:else}
    <figure class="relative">
      <div
        class="h-40 lg:h-50 w-full bg-radial-[at_50%_-50%] from-secondary to-base-300"
      ></div>
      <div
        class="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-base-300 to-transparent"
      ></div>
    </figure>
  {/if}
  <div class="card-body p-4 relative z-10 -mt-18">
    <div class="text-xs text-base-content/60 flex flex-wrap gap-2">
      <span class="badge badge-neutral badge-sm flex items-center gap-1">
        {#if article.feed_icon}
          <img
            src={article.feed_icon}
            alt=""
            class="w-4 h-4 flex-shrink-0"
            onerror={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            class="w-4 h-4 flex-shrink-0bi bi-rss-fill"
            viewBox="0 0 16 16"
          >
            <path
              d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm1.5 2.5c5.523 0 10 4.477 10 10a1 1 0 1 1-2 0 8 8 0 0 0-8-8 1 1 0 0 1 0-2m0 4a6 6 0 0 1 6 6 1 1 0 1 1-2 0 4 4 0 0 0-4-4 1 1 0 0 1 0-2m.5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3"
            />
          </svg>
        {/if}
        {article.feed_name}
      </span>
      {#if article.published}
        <span class="badge badge-neutral badge-sm">
          <time datetime={article.published}>
            {formatDate(article.published)}
          </time>
        </span>
      {/if}
      {#if article.author}
        <span class="badge badge-neutral badge-sm">{article.author}</span>
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
          <span class="badge badge-success badge-xs"
            >{formatReadTimestamp(readTimestamp)}</span
          >
        {/if}
        {#if article.tags && article.tags.length > 0}
          {#each article.tags.slice(0, 3) as tag}
            <span class="badge badge-neutral badge-xs">{tag}</span>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
</button>
