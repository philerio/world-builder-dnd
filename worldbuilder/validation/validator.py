from collections.abc import Mapping

from worldbuilder.models.campaign import Campaign
from worldbuilder.models.city import City
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.models.world import World
from worldbuilder.models.world_event import WorldEvent
from worldbuilder.registry import WorldRegistry
from worldbuilder.models.character import Character
from worldbuilder.models.npc import NPC

class ValidationResult:
    """Result of validating world data."""

    def __init__(self) -> None:
        self.errors: list[str] = []

    @property
    def is_valid(self) -> bool:
        """Return whether validation passed."""
        return len(self.errors) == 0

    def add_error(self, message: str) -> None:
        """Add a validation error."""
        self.errors.append(message)


def validate_reference(
    result: ValidationResult,
    collection: Mapping[str, object],
    referenced_id: str,
    entity_type: str,
) -> None:
    """Validate that a referenced ID exists."""
    if referenced_id not in collection:
        result.add_error(
            f"Unknown {entity_type} ID: {referenced_id}"
        )


def validate_registry(registry: WorldRegistry) -> ValidationResult:
    """Validate all entities in a world registry."""
    result = ValidationResult()

    for world in registry.worlds.values():
        if not isinstance(world, World):
            result.add_error(
                f"Invalid world object: {world!r}"
            )
    for npc in registry.npcs.values():
        validate_character_relationships(
            result,
            npc,
            registry,
        )

    for player_character in registry.player_characters.values():
        validate_character_relationships(
            result,
            player_character,
            registry,
        )
    
    for city in registry.cities.values():
        validate_city_references(result, city, registry)
    
    for npc in registry.npcs.values():
        validate_character_references(result, npc, registry)
        validate_character_relationships(result, npc, registry)
    
    for player_character in registry.player_characters.values():
        validate_character_references(result, player_character, registry)
        validate_character_relationships(result, player_character, registry)

    for campaign in registry.campaigns.values():
        validate_campaign_references(result, campaign, registry)

    for event in registry.timeline_events.values():
        validate_timeline_event_references(result, event, registry)
    
    for event in registry.world_events.values():
        validate_world_event_references(result, event, registry)
  
    return result

def validate_character_relationships(
    result: ValidationResult,
    character: Character,
    registry: WorldRegistry,
) -> None:
    """Validate references in a character's relationships."""
    for relationship in character.relationships:
        if (
            relationship.character not in registry.npcs
            and relationship.character not in registry.player_characters
        ):
            result.add_error(
                f"Unknown character ID: {relationship.character}"
            )

def validate_character_references(
    result: ValidationResult,
    character: Character,
    registry: WorldRegistry,
) -> None:
    if character.city is not None:
        validate_reference(result, registry.cities, character.city, "city")

    if character.region is not None:
        validate_reference(result, registry.regions, character.region, "region")

    if character.kingdom is not None:
        validate_reference(result, registry.kingdoms, character.kingdom, "kingdom")
        
def validate_city_references(
    result: ValidationResult,
    city: City,
    registry: WorldRegistry,
) -> None:
    if city.kingdom is not None:
        validate_reference(result, registry.kingdoms, city.kingdom, "kingdom")

    if city.region is not None:
        validate_reference(result, registry.regions, city.region, "region")
        
def validate_campaign_references(
    result: ValidationResult,
    campaign: Campaign,
    registry: WorldRegistry,
) -> None:
    for location_id in campaign.locations:
        validate_reference(
            result,
            registry.cities,
            location_id,
            "city",
        )

    for npc_id in campaign.npcs:
        validate_reference(
            result,
            registry.npcs,
            npc_id,
            "NPC",
        )

    for player_character_id in campaign.player_characters:
        validate_reference(
            result,
            registry.player_characters,
            player_character_id,
            "player character",
        )

def validate_world_event_references(
    result: ValidationResult,
    event: WorldEvent,
    registry: WorldRegistry,
) -> None:
    for location_id in event.locations:
        if (
            location_id not in registry.cities
            and location_id not in registry.regions
            and location_id not in registry.kingdoms
            and location_id not in registry.continents
        ):
            result.add_error(
                f"Unknown location ID: {location_id}"
            )
    
def validate_timeline_event_references(
    result: ValidationResult,
    event: TimelineEvent,
    registry: WorldRegistry,
) -> None:
    for character_id in event.characters:
        if (
            character_id not in registry.npcs
            and character_id not in registry.player_characters
        ):
            result.add_error(
                f"Unknown character ID: {character_id}"
            )

    for campaign_id in event.campaigns:
        validate_reference(
            result,
            registry.campaigns,
            campaign_id,
            "campaign",
        )
    
    for kingdom_id in event.kingdoms:
        validate_reference(
            result,
            registry.kingdoms,
            kingdom_id,
            "kingdom",
        )
        
def validate_world_event_references(
    result: ValidationResult,
    event: WorldEvent,
    registry: WorldRegistry,
) -> None:
    for campaign_id in event.campaigns:
        validate_reference(
            result,
            registry.campaigns,
            campaign_id,
            "campaign",
        )