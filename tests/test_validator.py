from pathlib import Path

from worldbuilder.loaders.world_loader import load_world_registry
from worldbuilder.validation.validator import validate_registry


def test_valid_registry() -> None:
    """A correctly loaded registry should pass validation."""
    registry = load_world_registry(
        Path("tests/data/test-world/world.yaml")
    )

    result = validate_registry(registry)

    assert result.is_valid
    assert result.errors == []


def test_validation_result_starts_valid() -> None:
    """A new validation result has no errors."""
    from worldbuilder.validation.validator import ValidationResult

    result = ValidationResult()

    assert result.is_valid
    assert result.errors == []


def test_validation_result_can_record_error() -> None:
    """Validation errors make the result invalid."""
    from worldbuilder.validation.validator import ValidationResult

    result = ValidationResult()

    result.add_error("Something went wrong.")

    assert not result.is_valid
    assert result.errors == ["Something went wrong."]


def test_validation_result_warning_does_not_make_world_invalid() -> None:
    from worldbuilder.validation.validator import ValidationResult

    result = ValidationResult()
    result.add_warning("Something may need attention.")

    assert result.is_valid
    assert result.errors == []
    assert result.warnings == ["Something may need attention."]
    assert result.issues == [{
        "message": "Something may need attention.",
        "severity": "warning",
    }]

def test_valid_reference() -> None:
    """An existing ID should pass reference validation."""
    from worldbuilder.validation.validator import ValidationResult, validate_reference

    result = ValidationResult()
    collection = {
        "reqrun": object(),
    }

    validate_reference(
        result,
        collection,
        "reqrun",
        "city",
    )

    assert result.is_valid
    assert result.errors == []


def test_unknown_reference() -> None:
    """A missing ID should produce a validation error."""
    from worldbuilder.validation.validator import ValidationResult, validate_reference

    result = ValidationResult()
    collection = {
        "reqrun": object(),
    }

    validate_reference(
        result,
        collection,
        "requrn",
        "city",
    )

    assert not result.is_valid
    assert result.errors == [
        "Unknown city ID: requrn"
    ]
    
def test_character_relationship_can_reference_player_character() -> None:
    """A character relationship can reference a player character."""
    from worldbuilder.models.npc import NPC
    from worldbuilder.models.player_character import PlayerCharacter
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import (
        ValidationResult,
        validate_character_relationships,
    )

    registry = WorldRegistry()

    aerith = PlayerCharacter(
        id="aerith",
        name="Aerith",
    )

    elorith = NPC(
        id="elorith",
        name="Elorith",
        relationships=[
            {
                "character": "aerith",
                "relationship": "daughter",
            }
        ],
    )

    registry.add_player_character(aerith)
    registry.add_npc(elorith)

    result = ValidationResult()

    validate_character_relationships(
        result,
        elorith,
        registry,
    )

    assert result.is_valid
    assert result.errors == []

def test_character_city_reference_is_validated() -> None:
    """A character's city reference must point to an existing city."""
    from worldbuilder.models.npc import NPC
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_npc(
        NPC(
            id="test-npc",
            name="Test NPC",
            city="reqrun",
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown city ID: reqrun",
    ]
    assert result.issues == [{
        "message": "Unknown city ID: reqrun",
        "severity": "error",
        "source_type": "npc",
        "source_id": "test-npc",
        "reference_id": "reqrun",
        "reference_type": "city",
        "reference_path": ["city"],
    }]

def test_character_region_reference_is_validated() -> None:
    """A character's region reference must point to an existing region."""
    from worldbuilder.models.npc import NPC
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_npc(
        NPC(
            id="test-npc",
            name="Test NPC",
            region="unknown-region",
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown region ID: unknown-region",
    ]


def test_character_kingdom_reference_is_validated() -> None:
    """A character's kingdom reference must point to an existing kingdom."""
    from worldbuilder.models.npc import NPC
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_npc(
        NPC(
            id="test-npc",
            name="Test NPC",
            kingdom="unknown-kingdom",
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown kingdom ID: unknown-kingdom",
    ]

def test_city_kingdom_reference_is_validated() -> None:
    """A city's kingdom reference must point to an existing kingdom."""
    from worldbuilder.models.city import City
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_city(
        City(
            id="reqrun",
            name="Reqrun",
            kingdom="unknown-kingdom",
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown kingdom ID: unknown-kingdom",
    ]


def test_city_region_reference_is_validated() -> None:
    """A city's region reference must point to an existing region."""
    from worldbuilder.models.city import City
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_city(
        City(
            id="reqrun",
            name="Reqrun",
            region="unknown-region",
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown region ID: unknown-region",
    ]


def test_geographic_entity_references_are_validated() -> None:
    """Kingdom, region, and location hierarchy links must resolve."""
    from worldbuilder.models.kingdom import Kingdom
    from worldbuilder.models.location import Location
    from worldbuilder.models.region import Region
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()
    registry.add_kingdom(Kingdom(
        id="test-kingdom",
        name="Test Kingdom",
        continent="unknown-continent",
        ruler="unknown-ruler",
        capital="unknown-capital",
    ))
    registry.add_region(Region(
        id="test-region",
        name="Test Region",
        kingdom="unknown-kingdom",
        continent="unknown-region-continent",
    ))
    registry.add_location(Location(
        id="test-location",
        name="Test Location",
        continent="unknown-location-continent",
        kingdom="unknown-location-kingdom",
        region="unknown-location-region",
    ))

    result = validate_registry(registry)

    assert result.errors == [
        "Unknown continent ID: unknown-continent",
        "Unknown NPC ID: unknown-ruler",
        "Unknown city ID: unknown-capital",
        "Unknown kingdom ID: unknown-kingdom",
        "Unknown continent ID: unknown-region-continent",
        "Unknown continent ID: unknown-location-continent",
        "Unknown kingdom ID: unknown-location-kingdom",
        "Unknown region ID: unknown-location-region",
    ]
    assert all(issue["source_type"] in {"kingdom", "region", "location"} for issue in result.issues)
    
def test_campaign_location_reference_is_validated() -> None:
    """A campaign location reference must point to an existing city."""
    from worldbuilder.models.campaign import Campaign
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_campaign(
        Campaign(
            id="test-campaign",
            name="Test Campaign",
            locations=["unknown-city"],
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown city ID: unknown-city",
    ]


def test_campaign_npc_reference_is_validated() -> None:
    """A campaign NPC reference must point to an existing NPC."""
    from worldbuilder.models.campaign import Campaign
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_campaign(
        Campaign(
            id="test-campaign",
            name="Test Campaign",
            npcs=["unknown-npc"],
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown NPC ID: unknown-npc",
    ]


def test_campaign_player_character_reference_is_validated() -> None:
    """A campaign PC reference must point to an existing player character."""
    from worldbuilder.models.campaign import Campaign
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_campaign(
        Campaign(
            id="test-campaign",
            name="Test Campaign",
            player_characters=["unknown-pc"],
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown player character ID: unknown-pc",
    ]
    
def test_timeline_event_character_reference_is_validated() -> None:
    """A timeline event character reference must point to an existing character."""
    from worldbuilder.models.timeline_event import TimelineEvent
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_timeline_event(
        TimelineEvent(
            id="test-event",
            name="Test Event",
            characters=["unknown-character"],
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown character ID: unknown-character",
    ]


def test_timeline_event_campaign_reference_is_validated() -> None:
    """A timeline event campaign reference must point to an existing campaign."""
    from worldbuilder.models.timeline_event import TimelineEvent
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_timeline_event(
        TimelineEvent(
            id="test-event",
            name="Test Event",
            campaigns=["unknown-campaign"],
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown campaign ID: unknown-campaign",
    ]
    
def test_timeline_event_kingdom_reference_is_validated() -> None:
    """A timeline event kingdom reference must point to an existing kingdom."""
    from worldbuilder.models.timeline_event import TimelineEvent
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_timeline_event(
        TimelineEvent(
            id="test-event",
            name="Test Event",
            kingdoms=["unknown-kingdom"],
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown kingdom ID: unknown-kingdom",
    ]
    
def test_world_event_campaign_reference_is_validated() -> None:
    """A world event campaign reference must point to an existing campaign."""
    from worldbuilder.models.world_event import WorldEvent
    from worldbuilder.registry import WorldRegistry
    from worldbuilder.validation.validator import validate_registry

    registry = WorldRegistry()

    registry.add_world_event(
        WorldEvent(
            id="test-event",
            name="Test Event",
            campaigns=["unknown-campaign"],
        )
    )

    result = validate_registry(registry)

    assert not result.is_valid
    assert result.errors == [
        "Unknown campaign ID: unknown-campaign",
    ]
def test_campaign_story_references_are_validated() -> None:
    registry = load_world_registry(
        Path("tests/data/test-world/world.yaml")
    )

    result = validate_registry(registry)

    assert result.is_valid
    
def test_campaign_story_with_unknown_entity_fails_validation() -> None:
    registry = load_world_registry(
        Path("tests/data/test-world/world.yaml")
    )

    campaign = registry.get_campaign("test-campaign")
    assert campaign is not None
    assert campaign.story is not None

    campaign.story.nodes[1].entity_id = "does-not-exist"

    result = validate_registry(registry)

    assert not result.is_valid
    assert "Unknown entity ID in story: does-not-exist" in result.errors
    
def test_map_marker_reference_is_validated() -> None:
    registry = load_world_registry(
        Path("tests/data/test-world/world.yaml")
    )

    result = validate_registry(registry)

    assert result.is_valid

def test_map_marker_without_linked_entity_is_valid() -> None:
    registry = load_world_registry(
        Path("tests/data/test-world/world.yaml")
    )

    map_object = registry.get_map("test-map")
    assert map_object is not None
    map_object.markers[0].entity_id = None

    result = validate_registry(registry)

    assert result.is_valid
    
def test_map_marker_unknown_entity_fails_validation() -> None:
    registry = load_world_registry(
        Path("tests/data/test-world/world.yaml")
    )

    map_object = registry.get_map("test-map")
    assert map_object is not None
    assert len(map_object.markers) == 1

    map_object.markers[0].entity_id = "does-not-exist"

    result = validate_registry(registry)

    assert not result.is_valid
    assert (
        "Unknown entity ID in map marker: does-not-exist"
        in result.errors
    )
    
def test_map_parent_reference_is_validated() -> None:
    registry = load_world_registry(
        Path("tests/data/test-world/world.yaml")
    )

    result = validate_registry(registry)

    assert result.is_valid

def test_map_unknown_parent_fails_validation() -> None:
    registry = load_world_registry(
        Path("tests/data/test-world/world.yaml")
    )

    map_object = registry.get_map("test-map")
    assert map_object is not None

    map_object.parent_map = "does-not-exist"

    result = validate_registry(registry)

    assert not result.is_valid
    assert "Unknown map ID: does-not-exist" in result.errors
