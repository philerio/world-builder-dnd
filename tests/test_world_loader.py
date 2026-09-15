from pathlib import Path

import pytest
from pydantic import ValidationError

from worldbuilder.loaders.yaml_loader import load_world
from worldbuilder.models.world import World
from worldbuilder.loaders.world_loader import load_world_registry

WORLD_PATH = Path("tests/data/test-world/world.yaml")


def test_load_valid_world() -> None:
    """A valid world YAML file should load into a World model."""

    world = load_world(WORLD_PATH)

    assert isinstance(world, World)
    assert world.id == "test-world"
    assert world.name == "Test World"
    assert world.version == "1.0"
    assert len(world.continents) == 1


def test_load_missing_file() -> None:
    """Loading a nonexistent file should raise FileNotFoundError."""

    missing_path = Path("tests/data/test-world/does_not_exist.yaml")

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

    assert registry.has_campaign("test-campaign")
    
def test_loads_artifacts():
    registry = load_world_registry(WORLD_PATH)

    artifact = registry.get_artifact("test-artifact")

    assert artifact is not None
    assert artifact.name == "Test Artifact"
    assert artifact.description == "An artifact used for automated tests."

def test_world_event_can_reference_artifact():
    registry = load_world_registry(WORLD_PATH)

    event = registry.get_world_event("test-event")

    assert event is not None
    assert "test-artifact" in event.hidden_connections

def test_campaign_loads_story_content() -> None:
    registry = load_world_registry(WORLD_PATH)

    campaign = registry.get_campaign("test-campaign")

    assert campaign is not None
    assert campaign.story is not None
    assert len(campaign.story.nodes) == 3
    assert campaign.story.nodes[1].type == "entity_link"
    assert campaign.story.nodes[1].entity_id == "test-artifact"
    
def test_loads_maps() -> None:
    registry = load_world_registry(WORLD_PATH)

    world_map = registry.get_map("test-map")

    assert world_map is not None
    assert world_map.name == "Test Map"
    assert world_map.map_type == "region"
    assert world_map.parent_map == "test-parent-map"