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
    from worldbuilder.validation.validator import ValidationResult
    from worldbuilder.validation.validator import validate_character_relationships

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
    from worldbuilder.validation.validator import ValidationResult
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