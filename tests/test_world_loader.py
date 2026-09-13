from pathlib import Path

import pytest
from pydantic import ValidationError

from worldbuilder.loaders.yaml_loader import load_world
from worldbuilder.models.world import World
from worldbuilder.loaders.world_loader import load_world_registry

WORLD_PATH = Path("worlds/elligaesia/world.yaml")


def test_load_valid_world() -> None:
    """A valid world YAML file should load into a World model."""

    world = load_world(WORLD_PATH)

    assert isinstance(world, World)
    assert world.id == "elligaesia-world"
    assert world.name == "Elligaesia"
    assert world.version == "1.0"
    assert len(world.continents) == 2


def test_load_missing_file() -> None:
    """Loading a nonexistent file should raise FileNotFoundError."""

    missing_path = Path("worlds/elligaesia/does_not_exist.yaml")

    with pytest.raises(FileNotFoundError):
        load_world(missing_path)


def test_invalid_world_data(tmp_path: Path) -> None:
    """Invalid world data should raise a Pydantic ValidationError."""

    invalid_file = tmp_path / "invalid_world.yaml"

    invalid_file.write_text(
        """
id: elligaesia-world
name: Elligaesia
version: 1.0
author: Patrick
continents:
  - elligaesia
""",
        encoding="utf-8",
    )

    with pytest.raises(ValidationError):
        load_world(invalid_file)
    
def test_load_world_registry_with_campaign() -> None:
    """The world registry loader should load campaigns."""

    registry = load_world_registry(WORLD_PATH)

    assert registry.has_campaign("the-unforgiven")