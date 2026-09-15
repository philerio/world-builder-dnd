from collections.abc import Mapping

from worldbuilder.models.campaign import Campaign
from worldbuilder.models.character import Character
from worldbuilder.models.city import City
from worldbuilder.models.map import Map
from worldbuilder.models.story import StoryContent
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.models.world import World
from worldbuilder.models.world_event import WorldEvent
from worldbuilder.registry import WorldRegistry


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

    for city in registry.cities.values():
        validate_city_references(result, city, registry)

    for npc in registry.npcs.values():
        validate_character_references(result, npc, registry)
        validate_character_relationships(result, npc, registry)

    for player_character in registry.player_characters.values():
        validate_character_references(
            result,
            player_character,
            registry,
        )
        validate_character_relationships(
            result,
            player_character,
            registry,
        )

    for campaign in registry.campaigns.values():
        validate_campaign_references(
            result,
            campaign,
            registry,
        )

    for event in registry.timeline_events.values():
        validate_timeline_event_references(
            result,
            event,
            registry,
        )

    for event in registry.world_events.values():
        validate_world_event_references(
            result,
            event,
            registry,
        )

    for map_object in registry.maps.values():
        validate_map_references(
            result,
            map_object,
            registry,
        )
    return result


def validate_character_relationships(
    result: ValidationResult,
    character: Character,
    registry: WorldRegistry,
) -> None:
    """Validate references in a character's relationships."""
    for relationship in character.relationships:
        validate_character_reference(
            result,
            registry,
            relationship.character,
        )


def validate_character_references(
    result: ValidationResult,
    character: Character,
    registry: WorldRegistry,
) -> None:
    """Validate a character's location references."""
    if character.city is not None:
        validate_reference(
            result,
            registry.cities,
            character.city,
            "city",
        )

    if character.region is not None:
        validate_reference(
            result,
            registry.regions,
            character.region,
            "region",
        )

    if character.kingdom is not None:
        validate_reference(
            result,
            registry.kingdoms,
            character.kingdom,
            "kingdom",
        )


def validate_city_references(
    result: ValidationResult,
    city: City,
    registry: WorldRegistry,
) -> None:
    """Validate a city's geographic references."""
    if city.kingdom is not None:
        validate_reference(
            result,
            registry.kingdoms,
            city.kingdom,
            "kingdom",
        )

    if city.region is not None:
        validate_reference(
            result,
            registry.regions,
            city.region,
            "region",
        )


def validate_campaign_references(
    result: ValidationResult,
    campaign: Campaign,
    registry: WorldRegistry,
) -> None:
    """Validate references contained in a campaign."""
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
    if campaign.story is not None:
        validate_story_content(
            result,
            campaign.story,
            registry,
        )


def validate_world_event_references(
    result: ValidationResult,
    event: WorldEvent,
    registry: WorldRegistry,
) -> None:
    """Validate references in a world event."""
    for campaign_id in event.campaigns:
        validate_reference(
            result,
            registry.campaigns,
            campaign_id,
            "campaign",
        )


def validate_timeline_event_references(
    result: ValidationResult,
    event: TimelineEvent,
    registry: WorldRegistry,
) -> None:
    """Validate references in a timeline event."""
    for character_id in event.characters:
        validate_character_reference(
            result,
            registry,
            character_id,
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
def validate_character_reference(
    result: ValidationResult,
    registry: WorldRegistry,
    character_id: str,
) -> None:
    """Validate that a character ID refers to an NPC or player character."""
    if (
        character_id not in registry.npcs
        and character_id not in registry.player_characters
    ):
        result.add_error(
            f"Unknown character ID: {character_id}"
        )

def validate_story_content(
    result: ValidationResult,
    story: StoryContent,
    registry: WorldRegistry,
) -> None:
    """Validate entity references contained in story content."""
    for node in story.nodes:
        if node.type == "entity_link":
            if registry.get_entity(node.entity_id) is None:
                result.add_error(
                    f"Unknown entity ID in story: {node.entity_id}"
                )


def validate_map_references(
    result: ValidationResult,
    map_object: Map,
    registry: WorldRegistry,
) -> None:
    """Validate entity references contained in map markers."""
    for marker in map_object.markers:
        if registry.get_entity(marker.entity_id) is None:
            result.add_error(
                f"Unknown entity ID in map marker: {marker.entity_id}"
            )
            
def validate_map_references(
    result: ValidationResult,
    map_object: Map,
    registry: WorldRegistry,
) -> None:
    """Validate references contained in a map."""
    if map_object.parent_map is not None:
        validate_reference(
            result,
            registry.maps,
            map_object.parent_map,
            "map",
        )

    for marker in map_object.markers:
        if registry.get_entity(marker.entity_id) is None:
            result.add_error(
                f"Unknown entity ID in map marker: {marker.entity_id}"
            )