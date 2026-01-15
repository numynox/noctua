"""
Data models for Noctua feed processing
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class Article(BaseModel):
    """Represents a single article/entry from an RSS feed"""
    id: str  # Unique identifier (usually the URL or guid)
    title: str
    url: str
    published: datetime | None = None
    updated: datetime | None = None
    author: str | None = None
    summary: str | None = None  # Original summary from feed
    content: str | None = None  # Full content if available
    
    # Computed/processed fields
    clean_content: str | None = None  # Cleaned/sanitized content
    ai_summary: str | None = None  # AI-generated summary
    word_count: int = 0
    
    # Metadata
    feed_name: str = ""
    section_id: str = ""
    tags: list[str] = Field(default_factory=list)
    
    # Processing flags
    is_filtered: bool = False
    filter_reason: str | None = None

    def __hash__(self) -> int:
        return hash(self.id)

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, Article):
            return self.id == other.id
        return False


class Feed(BaseModel):
    """Represents a feed with its articles"""
    id: str  # Feed identifier
    name: str
    url: str
    section_id: str
    
    # Feed metadata
    title: str | None = None
    description: str | None = None
    link: str | None = None
    last_updated: datetime | None = None
    
    # Articles
    articles: list[Article] = Field(default_factory=list)
    
    # Processing status
    fetch_status: str = "pending"  # pending, success, error
    fetch_error: str | None = None
    fetched_at: datetime | None = None


class Section(BaseModel):
    """Represents a section containing multiple feeds"""
    id: str
    name: str
    description: str = ""
    icon: str = "📰"
    
    feeds: list[Feed] = Field(default_factory=list)
    
    # AI-generated summary for the section
    ai_summary: str | None = None
    
    @property
    def total_articles(self) -> int:
        return sum(len(f.articles) for f in self.feeds)
    
    @property
    def all_articles(self) -> list[Article]:
        """Get all articles from all feeds in this section"""
        articles = []
        for feed in self.feeds:
            articles.extend(feed.articles)
        return articles


class FeedData(BaseModel):
    """Container for all processed feed data"""
    sections: list[Section] = Field(default_factory=list)
    
    # Processing metadata
    processed_at: datetime = Field(default_factory=datetime.now)
    step: str = ""  # Which step generated this data
    
    # AI-generated overall summary
    overall_summary: str | None = None
    
    @property
    def total_articles(self) -> int:
        return sum(s.total_articles for s in self.sections)
    
    @property
    def all_articles(self) -> list[Article]:
        """Get all articles from all sections"""
        articles = []
        for section in self.sections:
            articles.extend(section.all_articles)
        return articles
    
    def get_section(self, section_id: str) -> Section | None:
        """Get a section by ID"""
        for section in self.sections:
            if section.id == section_id:
                return section
        return None
