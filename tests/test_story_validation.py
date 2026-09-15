from pathlib import Path

from worldbuilder.loaders.world_loader import load_world_registry
from worldbuilder.models.story import StoryContent, StoryEntityLink, StoryText
from worldbuilder.validation.validator import (
    ValidationResult,
    validate_story_content,
)


WORLD_PATH = Path("tests/data/test-world/world.yaml")


def test_story_entity_link_is_validated() -> None:
    registry = load_world_registry(WORLD_PATH)

    story = StoryContent(
        nodes=[
            StoryText(text="The party discovered "),
            StoryEntityLink(
                text="an ancient artifact",
                entity_id="test-artifact",
            ),
        ]
    )

    result = ValidationResult()

    validate_story_content(
        result,
        story,
        registry,
    )

    assert result.is_valid


def test_story_entity_link_with_unknown_id_fails_validation() -> None:
    registry = load_world_registry(WORLD_PATH)

    story = StoryContent(
        nodes=[
            StoryText(text="The party discovered "),
            StoryEntityLink(
                text="something strange",
                entity_id="does-not-exist",
            ),
        ]
    )

    result = ValidationResult()

    validate_story_content(
        result,
        story,
        registry,
    )

    assert not result.is_valid
    assert "Unknown entity ID in story: does-not-exist" in result.errors