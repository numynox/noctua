"""
Configuration loading and validation for Noctua
"""

from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


class WebsiteSettings(BaseModel):
    """Website generation settings"""

    title: str = "Noctua News"
    description: str = "AI-curated news from your favorite sources"
    base_url: str = "/"
    theme: str = "dark"


class Settings(BaseModel):
    """Global settings"""

    output_base: str = "output"
    website: WebsiteSettings = Field(default_factory=WebsiteSettings)


class FeedConfig(BaseModel):
    """Individual feed configuration"""

    name: str
    url: str
    enabled: bool = True


class SectionConfig(BaseModel):
    """Section configuration with feeds"""

    name: str
    description: str = ""
    icon: str = "📰"
    enabled: bool = True
    feeds: list[FeedConfig] = Field(default_factory=list)


class GlobalFilters(BaseModel):
    """Global filtering rules"""

    max_age_hours: int = 72
    exclude_keywords: list[str] = Field(default_factory=list)
    require_keywords: list[str] = Field(default_factory=list)
    min_content_length: int = 100


class FilteringConfig(BaseModel):
    """Filtering configuration"""

    global_filters: GlobalFilters = Field(default_factory=GlobalFilters, alias="global")
    section_overrides: dict[str, dict[str, Any]] = Field(default_factory=dict)

    class Config:
        populate_by_name = True


class SummarizationPrompts(BaseModel):
    """Prompts for AI summarization"""

    section: str = "Create a brief overview of the most important stories."
    overall: str = "Create an executive summary of today's most important news."


class SummarizationConfig(BaseModel):
    """AI summarization settings"""

    model: str = "gemini-1.5-flash"
    articles_per_section_summary: int = 20
    max_articles_overall: int = 30
    prompts: SummarizationPrompts = Field(default_factory=SummarizationPrompts)


class NoctuaConfig(BaseModel):
    """Main configuration model"""

    settings: Settings = Field(default_factory=Settings)
    sections: dict[str, SectionConfig] = Field(default_factory=dict)
    filtering: FilteringConfig = Field(default_factory=FilteringConfig)
    summarization: SummarizationConfig = Field(default_factory=SummarizationConfig)

    def get_enabled_sections(self) -> dict[str, SectionConfig]:
        """Return only enabled sections"""
        return {k: v for k, v in self.sections.items() if v.enabled}

    def get_enabled_feeds(self, section_id: str) -> list[FeedConfig]:
        """Return enabled feeds for a section"""
        section = self.sections.get(section_id)
        if not section:
            return []
        return [f for f in section.feeds if f.enabled]

    def get_section_filters(self, section_id: str) -> GlobalFilters:
        """Get filters for a section (with overrides applied)"""
        base_filters = self.filtering.global_filters.model_copy()
        overrides = self.filtering.section_overrides.get(section_id, {})

        for key, value in overrides.items():
            if hasattr(base_filters, key):
                setattr(base_filters, key, value)

        return base_filters


def find_config_file() -> Path:
    """Find the configuration file, checking multiple locations"""
    possible_paths = [
        Path("config.yaml"),
        Path("config.yml"),
    ]

    # Also check relative to this file's location
    module_dir = Path(__file__).parent.parent.parent
    for p in list(possible_paths):
        possible_paths.append(module_dir / p)

    for path in possible_paths:
        if path.exists():
            return path.resolve()

    raise FileNotFoundError(
        f"Configuration file not found. Tried: {[str(p) for p in possible_paths]}"
    )


def load_config(config_path: Path | str | None = None) -> NoctuaConfig:
    """Load and validate the configuration file"""
    if config_path is None:
        config_path = find_config_file()
    else:
        config_path = Path(config_path)

    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")

    with open(config_path, encoding="utf-8") as f:
        raw_config = yaml.safe_load(f)

    return NoctuaConfig.model_validate(raw_config)
