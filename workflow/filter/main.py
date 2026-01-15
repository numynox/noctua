"""
Filter and Cleanup RSS Feeds

This module filters articles based on configuration rules and cleans up content.
Input: output/download.json
Output: output/filter.json
"""

import re
import sys
from datetime import UTC, datetime
from pathlib import Path

from rich.console import Console

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from workflow.common import (
    Article,
    FeedData,
    NoctuaConfig,
    load_config,
    load_step_output,
    save_step_output,
)
from workflow.common.config import GlobalFilters

console = Console()


def check_keywords(
    text: str,
    exclude_keywords: list[str],
    require_keywords: list[str],
) -> tuple[bool, str | None]:
    """
    Check if text passes keyword filters.

    Returns:
        (passes, reason) - True if passes, reason is set if filtered out
    """
    text_lower = text.lower()

    # Check exclude keywords
    for keyword in exclude_keywords:
        if keyword.lower() in text_lower:
            return False, f"Contains excluded keyword: {keyword}"

    # Check require keywords (if any specified)
    if require_keywords:
        found = any(kw.lower() in text_lower for kw in require_keywords)
        if not found:
            return False, "Missing required keywords"

    return True, None


def filter_article(
    article: Article,
    filters: GlobalFilters,
    now: datetime,
) -> Article:
    """Apply filters to a single article"""
    """Apply filters to a single article"""
    # Check age
    if article.published:
        # Make sure both datetimes are timezone-aware or naive
        pub_time = article.published
        if pub_time.tzinfo is None:
            age_hours = (now.replace(tzinfo=None) - pub_time).total_seconds() / 3600
        else:
            age_hours = (now - pub_time.replace(tzinfo=UTC)).total_seconds() / 3600

        if age_hours > filters.max_age_hours:
            article.is_filtered = True
            article.filter_reason = f"Too old ({age_hours:.0f}h > {filters.max_age_hours}h)"
            return article

    # Check keywords in title and content
    text_to_check = f"{article.title} {article.summary}"
    passes, reason = check_keywords(
        text_to_check,
        filters.exclude_keywords,
        filters.require_keywords,
    )

    if not passes:
        article.is_filtered = True
        article.filter_reason = reason
        return article

    return article


def deduplicate_articles(articles: list[Article]) -> list[Article]:
    """Remove duplicate articles based on URL and title similarity"""
    seen_urls: set[str] = set()
    seen_titles: set[str] = set()
    unique: list[Article] = []

    for article in articles:
        # Normalize URL
        url_key = article.url.lower().rstrip("/")

        # Normalize title for comparison
        title_key = re.sub(r"[^\w\s]", "", article.title.lower())
        title_key = re.sub(r"\s+", " ", title_key).strip()

        if url_key in seen_urls:
            article.is_filtered = True
            article.filter_reason = "Duplicate URL"
        elif title_key in seen_titles:
            article.is_filtered = True
            article.filter_reason = "Duplicate title"
        else:
            seen_urls.add(url_key)
            seen_titles.add(title_key)

        unique.append(article)

    return unique


def filter_feeds(config: NoctuaConfig, data: FeedData) -> FeedData:
    """Apply all filters to the feed data"""
    now = datetime.now(UTC)

    stats = {
        "total": 0,
        "kept": 0,
        "filtered": 0,
        "reasons": {},
    }

    for section in data.sections:
        section_filters = config.get_section_filters(section.id)

        for feed in section.feeds:
            # Filter each article
            for i, article in enumerate(feed.articles):
                stats["total"] += 1
                feed.articles[i] = filter_article(article, section_filters, now)

            # Deduplicate
            feed.articles = deduplicate_articles(feed.articles)

            # Count stats
            for article in feed.articles:
                if article.is_filtered:
                    stats["filtered"] += 1
                    reason = article.filter_reason or "Unknown"
                    stats["reasons"][reason] = stats["reasons"].get(reason, 0) + 1
                else:
                    stats["kept"] += 1

    # Update metadata
    data.processed_at = datetime.now()
    data.step = "filter"

    # Print stats
    console.print("\n[bold]Filtering Summary[/bold]")
    console.print(f"  Total articles: {stats['total']}")
    console.print(f"  [green]Kept: {stats['kept']}[/green]")
    console.print(f"  [yellow]Filtered: {stats['filtered']}[/yellow]")

    if stats["reasons"]:
        console.print("\n  [dim]Top filter reasons:[/dim]")
        # Show top 5 reasons
        for reason, count in sorted(stats["reasons"].items(), key=lambda x: -x[1])[:5]:
            percentage = (count / stats["filtered"] * 100) if stats["filtered"] > 0 else 0
            console.print(f"    • {reason}: {count} ({percentage:.1f}%)")

    return data


def main(config_path: str | None = None) -> None:
    """Main entry point for filtering"""
    console.print("\n[bold blue]═══ Noctua: Filter Feeds ═══[/bold blue]\n")

    try:
        config = load_config(config_path)
    except FileNotFoundError as e:
        console.print(f"[red]Error: {e}[/red]")
        return

    # Load step 1 output
    try:
        data = load_step_output(step="download", model_class=FeedData)
        console.print(f"[dim]Loaded {data.total_articles} articles from download step[/dim]\n")
    except FileNotFoundError as e:
        console.print(f"[red]Error: {e}[/red]")
        return

    # Apply filters
    filtered_data = filter_feeds(config, data)

    # Remove filtered articles from output (keep only valid ones)
    for section in filtered_data.sections:
        for feed in section.feeds:
            feed.articles = [a for a in feed.articles if not a.is_filtered]

    # Save output
    output_path = save_step_output(filtered_data, step="filter")

    console.print("\n[bold green]✓ Filtering complete[/bold green]")
    console.print(f"  Remaining: {filtered_data.total_articles} articles")
    console.print(f"  Output: {output_path}")


if __name__ == "__main__":
    import sys

    config_path = sys.argv[1] if len(sys.argv) > 1 else None
    main(config_path)
