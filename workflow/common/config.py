"""
Configuration loading and validation for Noctua
"""

from pathlib import Path

import yaml
from pydantic import BaseModel, Field


class WebsiteSettings(BaseModel):
    """Website generation settings"""

    title: str = "Noctua News"
    description: str = "AI-curated news from your favorite sources"
    base_url: str = "/"


class FilterConfig(BaseModel):
    """Filtering rules that can be applied at global, section, or feed level"""

    max_age_hours: int | None = None
    exclude_keywords: list[str] | None = None
    require_keywords: list[str] | None = None
    exclude_url_part: str | None = None
    require_url_part: str | None = None
    deduplicate: bool | None = None


class FeedConfig(BaseModel):
    """Individual feed configuration"""

    name: str
    url: str
    enabled: bool = True
    filter: FilterConfig | None = None


class SectionConfig(BaseModel):
    """Section configuration with feeds"""

    name: str
    description: str = ""
    icon: str = "📰"
    enabled: bool = True
    filter: FilterConfig | None = None
    feeds: list[FeedConfig] = Field(default_factory=list)


class Settings(BaseModel):
    """Global settings"""

    output_base: str = "output"
    website: WebsiteSettings = Field(default_factory=WebsiteSettings)
    filter: FilterConfig | None = None


class SummarizationPrompts(BaseModel):
    """Prompts for AI summarization"""

    section: str = "Create a brief overview of the most important stories."
    overall: str = "Create an executive summary of today's most important news."


class SummarizationConfig(BaseModel):
    """AI summarization settings"""

    model: str = "gemini-1.5-flash"
    output_language: str = "English"
    articles_per_section_summary: int = 20
    max_articles_overall: int = 30
    prompts: SummarizationPrompts = Field(default_factory=SummarizationPrompts)


class NoctuaConfig(BaseModel):
    """Main configuration model"""

    settings: Settings = Field(default_factory=Settings)
    sections: dict[str, SectionConfig] = Field(default_factory=dict)
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

    def get_effective_filter(
        self, section_id: str | None = None, feed_name: str | None = None
    ) -> FilterConfig:
        """
        Resolve the hierarchical filter for a specific feed or section.
        Precedence: Feed -> Section -> Global -> Defaults
        """
        # Start with defaults
        resolved = FilterConfig(
            max_age_hours=72, deduplicate=True
        )  # Default 72h and deduplicate=True

        # 1. Global level
        if self.settings.filter:
            self._apply_filter_override(resolved, self.settings.filter)

        # 2. Section level
        if section_id and section_id in self.sections:
            section = self.sections[section_id]
            if section.filter:
                self._apply_filter_override(resolved, section.filter)

            # 3. Feed level
            if feed_name:
                for feed in section.feeds:
                    if feed.name == feed_name and feed.filter:
                        self._apply_filter_override(resolved, feed.filter)
                        break

        return resolved

    def _apply_filter_override(self, base: FilterConfig, override: FilterConfig) -> None:
        """Apply overrides from one FilterConfig to another"""
        for field in override.model_fields:
            val = getattr(override, field)
            if val is not None:
                setattr(base, field, val)


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
