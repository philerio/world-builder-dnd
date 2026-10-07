from collections.abc import Iterator, Mapping
from contextlib import contextmanager

from worldbuilder.models.campaign import Campaign
from worldbuilder.models.character import Character
from worldbuilder.models.city import City
from worldbuilder.models.lore import Lore
from worldbuilder.models.map import Map
from worldbuilder.models.story import CampaignStory, StoryContent, WorldStoryThreadLink
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.models.world import World
from worldbuilder.models.world_event import WorldEvent
from worldbuilder.models.world_story import WorldStory
from worldbuilder.registry import WorldRegistry


class ValidationResult:
    """Result of validating world data."""

    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.issues: list[dict[str, str]] = []
        self._entity_context: tuple[str, str] | None = None

    @property
    def is_valid(self) -> bool:
        """Return whether validation passed."""
        return len(self.errors) == 0

    def add_error(self, message: str) -> None:
        """Add a validation error."""
        self.errors.append(message)
        issue = {"message": message, "severity": "error"}
        if self._entity_context:
            entity_type, entity_id = self._entity_context
            issue["source_type"] = entity_type
            issue["source_id"] = entity_id
        self.issues.append(issue)

    def add_warning(self, message: str) -> None:
        """Record a non-blocking data quality warning."""
        self.warnings.append(message)
        issue = {"message": message, "severity": "warning"}
        if self._entity_context:
            entity_type, entity_id = self._entity_context
            issue["source_type"] = entity_type
            issue["source_id"] = entity_id
        self.issues.append(issue)

    @contextmanager
    def entity_context(self, entity_type: str, entity_id: str) -> Iterator[None]:
        """Attach the entity being checked to any errors raised in this scope."""
        previous_context = self._entity_context
        self._entity_context = (entity_type, entity_id)
        try:
            yield
        finally:
            self._entity_context = previous_context


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
        with result.entity_context("world", world.id):
            if not isinstance(world, World):
                result.add_error(
                    f"Invalid world object: {world!r}"
                )

    for city in registry.cities.values():
        with result.entity_context("city", city.id):
            validate_city_references(result, city, registry)

    for npc in registry.npcs.values():
        with result.entity_context("npc", npc.id):
            validate_character_references(result, npc, registry)
            validate_character_relationships(result, npc, registry)

    for player_character in registry.player_characters.values():
        with result.entity_context("player_character", player_character.id):
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
        with result.entity_context("campaign", campaign.id):
            validate_campaign_references(
                result,
                campaign,
                registry,
            )

    for event in registry.timeline_events.values():
        with result.entity_context("timeline_event", event.id):
            validate_timeline_event_references(
                result,
                event,
                registry,
            )

    for event in registry.world_events.values():
        with result.entity_context("world_event", event.id):
            validate_world_event_references(
                result,
                event,
                registry,
            )

    for lore in registry.lores.values():
        with result.entity_context("lore", lore.id):
            validate_lore_references(result, lore, registry)

    for story in registry.world_stories.values():
        with result.entity_context("world_story", story.id):
            validate_world_story_references(result, story, registry)

    for map_object in registry.maps.values():
        with result.entity_context("map", map_object.id):
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
    if isinstance(campaign.story, StoryContent):
        validate_story_content(
            result,
            campaign.story,
            registry,
        )
    elif isinstance(campaign.story, CampaignStory):
        for action in campaign.story.player_actions:
            for story_id in action.world_stories:
                validate_reference(
                    result,
                    registry.world_stories,
                    story_id,
                    "world story",
                )
            validate_world_story_thread_links(result, action.world_story_threads, registry)
        for beat in campaign.story.beats:
            for story_id in beat.world_stories:
                validate_reference(result, registry.world_stories, story_id, "world story")
            validate_world_story_thread_links(result, beat.world_story_threads, registry)
            for consequence in beat.consequences:
                for story_id in consequence.world_stories:
                    validate_reference(
                        result,
                        registry.world_stories,
                        story_id,
                        "world story",
                    )
                validate_world_story_thread_links(result, consequence.world_story_threads, registry)
            for content in (
                beat.description_content,
                beat.events_content,
                beat.triggers_content,
                beat.possible_approaches_content,
            ):
                if content is not None:
                    validate_story_content(result, content, registry)


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
    for story_id in event.world_stories:
        validate_reference(
            result,
            registry.world_stories,
            story_id,
            "world story",
        )
    validate_world_story_thread_links(result, event.world_story_threads, registry)
    if event.timeline_event_id:
        validate_reference(result, registry.timeline_events, event.timeline_event_id, "timeline event")
    for location_id in event.locations:
        if all(location_id not in collection for collection in (
            registry.cities,
            registry.locations,
            registry.regions,
            registry.kingdoms,
        )):
            result.add_error(f"Unknown location ID in world event: {location_id}")
    for character_id in event.characters:
        if character_id not in registry.npcs and character_id not in registry.player_characters:
            result.add_error(f"Unknown character ID in world event: {character_id}")
    for source in event.story_sources:
        validate_reference(
            result,
            registry.campaigns,
            source.campaign_id,
            "campaign",
        )


def validate_lore_references(
    result: ValidationResult,
    lore: Lore,
    registry: WorldRegistry,
) -> None:
    """Validate campaign references contained in lore records."""
    for campaign_id in lore.campaigns:
        validate_reference(result, registry.campaigns, campaign_id, "campaign")


def validate_world_story_references(
    result: ValidationResult,
    story: WorldStory,
    registry: WorldRegistry,
) -> None:
    """Validate campaigns, characters, and events linked to a world story."""
    for campaign_id in story.campaigns:
        validate_reference(result, registry.campaigns, campaign_id, "campaign")
    for character_id in story.characters:
        validate_character_reference(result, registry, character_id)
    for event_id in story.world_events:
        validate_reference(result, registry.world_events, event_id, "world event")
    for thread in story.threads:
        for campaign_id in thread.campaigns:
            validate_reference(result, registry.campaigns, campaign_id, "campaign")
        for event_id in thread.world_events:
            validate_reference(result, registry.world_events, event_id, "world event")
    for contribution in story.contributions:
        validate_reference(
            result,
            registry.campaigns,
            contribution.campaign_id,
            "campaign",
        )
        for thread_id in contribution.thread_ids:
            if all(thread.id != thread_id for thread in story.threads):
                result.add_error(f"Unknown thread ID in world story contribution: {thread_id}")


def validate_world_story_thread_links(
    result: ValidationResult,
    links: list[WorldStoryThreadLink],
    registry: WorldRegistry,
) -> None:
    """Validate World Story and thread references attached to a campaign entity."""
    for link in links:
        world_story = registry.world_stories.get(link.world_story_id)
        if world_story is None:
            result.add_error(f"Unknown world story ID: {link.world_story_id}")
        elif all(thread.id != link.thread_id for thread in world_story.threads):
            result.add_error(
                f"Unknown thread ID in world story {link.world_story_id}: {link.thread_id}"
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
    for story_id in event.world_stories:
        validate_reference(result, registry.world_stories, story_id, "world story")
    validate_world_story_thread_links(result, event.world_story_threads, registry)
    if event.source_world_event_id:
        validate_reference(result, registry.world_events, event.source_world_event_id, "world event")

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
        if node.type == "entity_link" and registry.get_entity(node.entity_id) is None:
            result.add_error(
                f"Unknown entity ID in story: {node.entity_id}"
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
        if marker.entity_id and registry.get_entity(marker.entity_id) is None:
            result.add_error(
                f"Unknown entity ID in map marker: {marker.entity_id}"
            )
