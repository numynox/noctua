"""
I/O utilities for saving and loading step outputs
"""

import json
import os
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

from .config import load_config

T = TypeVar("T", bound=BaseModel)


def get_project_root() -> Path:
    """Get the project root directory"""
    # Check for environment variable first (for Docker/CI)
    if env_root := os.environ.get("NOCTUA_ROOT"):
        return Path(env_root)

    # Otherwise, find the project root by looking for pyproject.toml
    current = Path(__file__).resolve()
    for parent in [current] + list(current.parents):
        if (parent / "pyproject.toml").exists():
            return parent

    # Fallback to current working directory
    return Path.cwd()


def get_base_output_dir() -> Path:
    """
    Get the base output directory.

    Supports environment variable overrides for Docker/CI:
    - NOCTUA_OUTPUT_DIR: Base output directory
    """
    # Check for base output directory override
    if base_override := os.environ.get("NOCTUA_OUTPUT_DIR"):
        return Path(base_override)

    # Default: use config setting
    try:
        config = load_config()
        base = config.settings.output_base
    except FileNotFoundError:
        base = "output"

    return get_project_root() / base


def ensure_dir(path: Path) -> Path:
    """Ensure a directory exists and return it"""
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_step_output(
    data: BaseModel,
    step: str,
    filename: str | None = None,
) -> Path:
    """
    Save step output to JSON file.

    Args:
        data: Pydantic model to save
        step: Step name ('download', 'filter', 'summarize')
        filename: Output filename (default: {step}.json)

    Returns:
        Path to the saved file
    """
    output_dir = ensure_dir(get_base_output_dir())

    if filename is None:
        filename = f"{step}.json"

    output_path = output_dir / filename

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(data.model_dump_json(indent=2))

    return output_path


def load_step_output(
    step: str,
    model_class: type[T],
    filename: str | None = None,
) -> T:
    """
    Load step output from JSON file.

    Args:
        step: Step name ('download', 'filter', 'summarize')
        model_class: Pydantic model class to parse into
        filename: Input filename (default: {step}.json)

    Returns:
        Parsed model instance
    """
    output_dir = get_base_output_dir()

    if filename is None:
        filename = f"{step}.json"

    input_path = output_dir / filename

    if not input_path.exists():
        raise FileNotFoundError(
            f"Step '{step}' output not found at {input_path}. Please run step '{step}' first."
        )

    with open(input_path, encoding="utf-8") as f:
        raw_data = json.load(f)

    return model_class.model_validate(raw_data)
