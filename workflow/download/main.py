"""
Download and Parse RSS Feeds

This module downloads RSS/Atom feeds and parses them into a structured format.
Output is saved to output/download.json for use by subsequent steps.
"""

import asyncio
import hashlib
import sys
from datetime import datetime
from pathlib import Path

import feedparser
import httpx
from bs4 import BeautifulSoup
from dateutil import parser as date_parser
from rich.console import Console

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from workflow.common import (
    Article,
    Feed,
    FeedData,
    NoctuaConfig,
    Section,
    load_config,
    save_step_output,
)

console = Console()


def parse_date(date_str: str | None) -> datetime | None:
    """Parse a date string into a datetime object"""
    if not date_str:
        return None
    try:
        return date_parser.parse(date_str)
    except (ValueError, TypeError):
        return None


def generate_article_id(url: str, title: str) -> str:
    """Generate a unique ID for an article"""
    content = f"{url}:{title}"
    return hashlib.sha256(content.encode()).hexdigest()[:16]


def sanitize_summary(text: str) -> str:
    """
    Sanitize summary text by removing HTML tags and links.
    Returns plain text.
    """
    if not text:
        return ""

    try:
        soup = BeautifulSoup(text, "html.parser")

        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()

        # Unwrap inline elements to avoid unwanted spaces
        inline_tags = [
            "a",
            "b",
            "i",
            "u",
            "strong",
            "em",
            "span",
            "sub",
            "sup",
            "code",
            "small",
            "big",
        ]
        for tag_name in inline_tags:
            for tag in soup.find_all(tag_name):
                tag.unwrap()

        # Merge adjacent strings to prevent extra spaces during get_text
        soup.smooth()

        # Get text, separating blocks with spaces
        text = soup.get_text(separator=" ")

        # Normalize whitespace (replace multiple spaces/newlines with single space)
        text = " ".join(text.split())

        return text
    except Exception:
        # Fallback for very broken HTML
        return text


def parse_feed_entry(entry: dict, feed_name: str, section_id: str) -> Article:
    """Parse a single feed entry into an Article"""
    # Get the URL (link)
    url = entry.get("link", "")

    # Get the unique ID
    article_id = (
        entry.get("id") or entry.get("guid") or generate_article_id(url, entry.get("title", ""))
    )

    raw_summary = entry.get("summary", "")
    raw_content = ""
    if "content" in entry and entry["content"]:
        raw_content = entry["content"][0].get("value", "")
    elif "summary_detail" in entry:
        raw_content = entry["summary_detail"].get("value", "")

    # Extract image from raw HTML before sanitization
    image_url = None

    # 1. Try media_content (Atom/RSS media extension)
    if "media_content" in entry:
        for media in entry["media_content"]:
            if media.get("medium") == "image" and "url" in media:
                image_url = media["url"]
                break

    # 2. Try enclosures (RSS)
    if not image_url and "enclosures" in entry:
        for enclosure in entry["enclosures"]:
            if enclosure.get("type", "").startswith("image/") and "href" in enclosure:
                image_url = enclosure["href"]
                break

    # 3. Try finding image in content or summary
    if not image_url:
        search_text = raw_content or raw_summary
        if search_text:
            try:
                soup = BeautifulSoup(search_text, "html.parser")
                img = soup.find("img")
                if img and img.get("src"):
                    image_url = str(img["src"])
            except Exception:
                pass

    # Consolidate and sanitize content
    # We prefer summary if available, otherwise content
    combined_raw = raw_summary if raw_summary else raw_content
    clean_summary = sanitize_summary(combined_raw)

    # Parse dates
    published = None
    if "published_parsed" in entry and entry["published_parsed"]:
        try:
            published = datetime(*entry["published_parsed"][:6])
        except (TypeError, ValueError):
            published = parse_date(entry.get("published"))
    else:
        published = parse_date(entry.get("published"))

    updated = None
    if "updated_parsed" in entry and entry["updated_parsed"]:
        try:
            updated = datetime(*entry["updated_parsed"][:6])
        except (TypeError, ValueError):
            updated = parse_date(entry.get("updated"))
    else:
        updated = parse_date(entry.get("updated"))

    # Get author
    author = entry.get("author")
    if not author and "authors" in entry and entry["authors"]:
        author = entry["authors"][0].get("name")

    # Get tags
    tags = []
    if "tags" in entry:
        tags = [t.get("term", "") for t in entry["tags"] if t.get("term")]

    return Article(
        id=article_id,
        title=entry.get("title", "Untitled"),
        url=url,
        published=published,
        updated=updated,
        author=author,
        summary=clean_summary,
        feed_name=feed_name,
        section_id=section_id,
        tags=tags,
        image_url=image_url,
    )


async def fetch_feed(
    client: httpx.AsyncClient,
    feed_url: str,
    feed_name: str,
    section_id: str,
) -> Feed:
    """Fetch and parse a single feed"""
    feed = Feed(
        id=hashlib.sha256(feed_url.encode()).hexdigest()[:16],
        name=feed_name,
        url=feed_url,
        section_id=section_id,
    )

    try:
        response = await client.get(
            feed_url,
            follow_redirects=True,
            timeout=30.0,
        )
        response.raise_for_status()

        # Parse the feed
        parsed = feedparser.parse(response.text)

        if parsed.bozo and not parsed.entries:
            feed.fetch_status = "error"
            feed.fetch_error = str(parsed.bozo_exception)
            return feed

        # Extract feed metadata
        feed.title = parsed.feed.get("title")
        feed.description = parsed.feed.get("description") or parsed.feed.get("subtitle")
        feed.link = parsed.feed.get("link")

        # Parse entries
        for entry in parsed.entries:
            try:
                article = parse_feed_entry(entry, feed_name, section_id)
                feed.articles.append(article)
            except Exception as e:
                console.print(f"  [yellow]Warning: Failed to parse entry: {e}[/yellow]")

        feed.fetch_status = "success"
        feed.fetched_at = datetime.now()

    except httpx.HTTPStatusError as e:
        feed.fetch_status = "error"
        feed.fetch_error = f"HTTP {e.response.status_code}"
    except httpx.RequestError as e:
        feed.fetch_status = "error"
        feed.fetch_error = str(e)
    except Exception as e:
        feed.fetch_status = "error"
        feed.fetch_error = str(e)

    return feed


async def download_feeds(config: NoctuaConfig) -> FeedData:
    """Download all enabled feeds from the config"""
    data = FeedData(step="download")

    async with httpx.AsyncClient(
        headers={"User-Agent": "Noctua/1.0 (RSS Feed Aggregator)"}
    ) as client:
        for section_id, section_config in config.get_enabled_sections().items():
            console.print(f"[cyan]Downloading {section_config.name}...[/cyan]")

            section = Section(
                id=section_id,
                name=section_config.name,
                description=section_config.description,
                icon=section_config.icon,
            )

            enabled_feeds = config.get_enabled_feeds(section_id)

            if not enabled_feeds:
                continue

            # Fetch all feeds in this section concurrently
            tasks = [fetch_feed(client, feed.url, feed.name, section_id) for feed in enabled_feeds]

            with console.status(f"  [dim]Fetching {len(enabled_feeds)} feeds...[/dim]"):
                feeds = await asyncio.gather(*tasks)

            for feed in feeds:
                section.feeds.append(feed)

                status_icon = "✓" if feed.fetch_status == "success" else "✗"
                status_color = "green" if feed.fetch_status == "success" else "red"

                console.print(
                    f"  [{status_color}]{status_icon}[/{status_color}] "
                    f"{feed.name}: {len(feed.articles)} articles"
                )

            data.sections.append(section)

    return data


def main(config_path: str | None = None) -> None:
    """Main entry point for"""
    console.print("\n[bold blue]═══ Noctua: Download Feeds ═══[/bold blue]\n")

    try:
        config = load_config(config_path)
    except FileNotFoundError as e:
        console.print(f"[red]Error: {e}[/red]")
        return

    # Download feeds
    data = asyncio.run(download_feeds(config))

    # Save output
    output_path = save_step_output(data, step="download")

    # Summary
    console.print(f"\n[bold green]✓ Downloaded {data.total_articles} articles[/bold green]")
    console.print(f"  Sections: {len(data.sections)}")
    console.print(f"  Output: {output_path}")


if __name__ == "__main__":
    import sys

    config_path = sys.argv[1] if len(sys.argv) > 1 else None
    main(config_path)
