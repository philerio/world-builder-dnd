from collections.abc import Iterator, Mapping
from contextlib import contextmanager

from worldbuilder.models.campaign import Campaign
from worldbuilder.models.character import Character
from worldbuilder.models.city import City
from worldbuilder.models.kingdom import Kingdom
from worldbuilder.models.lore import Lore
from worldbuilder.models.location import Location
from worldbuilder.models.map import Map
from worldbuilder.models.region import Region
from worldbuilder.models.story import CampaignStory, StoryContent, WorldStoryThreadLink
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.models.world import World
from worldbuilder.models.world_event import WorldEvent
from worldbuilder.models.world_story import WorldStory
from worldbuilder.models.dm_scratchpad import DmScratchpadEntry
from worldbuilder.registry import WorldRegistry


class ValidationResult:
    """Result of validating world data."""

    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.issues: list[dict[str, object]] = []
        self._entity_context: tuple[str, str] | None = None

    @property
    def is_valid(self) -> bool:
        """Return whether validation passed."""
        return len(self.errors) == 0

    def add_error(
        self,
        message: str,
        *,
        reference_id: str | None = None,
        reference_type: str | None = None,
        reference_path: list[str | int] | None = None,
    ) -> None:
        """Add a validation error."""
        self.errors.append(message)
        issue = {"message": message, "severity": "error"}
        if self._entity_context:
            entity_type, entity_id = self._entity_context
            issue["source_type"] = entity_type
            issue["source_id"] = entity_id
        if reference_id is not None and reference_type is not None and reference_path is not None:
            issue["reference_id"] = reference_id
            issue["reference_type"] = reference_type
            issue["reference_path"] = reference_path
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
    *,
    reference_type: str | None = None,
    reference_path: list[str | int] | None = None,
) -> None:
    """Validate that a referenced ID exists."""
    if referenced_id not in collection:
        result.add_error(
            f"Unknown {entity_type} ID: {referenced_id}",
            reference_id=referenced_id if reference_type and reference_path is not None else None,
            reference_type=reference_type,
            reference_path=reference_path,
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

    for kingdom in registry.kingdoms.values():
        with result.entity_context("kingdom", kingdom.id):
            validate_kingdom_references(result, kingdom, registry)

    for region in registry.regions.values():
        with result.entity_context("region", region.id):
            validate_region_references(result, region, registry)

    for location in registry.locations.values():
        with result.entity_context("location", location.id):
            validate_location_references(result, location, registry)

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

    for entry in registry.dm_scratchpad_entries.values():
        with result.entity_context("dm_scratchpad_entry", entry.id):
            if entry.promoted_entity_id and registry.get_entity(entry.promoted_entity_id) is None:
                result.add_error(
                    f"Unknown promoted entity ID: {entry.promoted_entity_id}",
                    reference_id=entry.promoted_entity_id,
                    reference_type="entity",
                    reference_path=["promoted_entity_id"],
                )
    return result


def validate_character_relationships(
    result: ValidationResult,
    character: Character,
    registry: WorldRegistry,
) -> None:
    """Validate references in a character's relationships."""
    for index, relationship in enumerate(character.relationships):
        validate_character_reference(
            result,
            registry,
            relationship.character,
            ["relationships", index, "character"],
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
            reference_type="city",
            reference_path=["city"],
        )

    if character.region is not None:
        validate_reference(
            result,
            registry.regions,
            character.region,
            "region",
            reference_type="region",
            reference_path=["region"],
        )

    if character.kingdom is not None:
        validate_reference(
            result,
            registry.kingdoms,
            character.kingdom,
            "kingdom",
            reference_type="kingdom",
            reference_path=["kingdom"],
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
            reference_type="kingdom",
            reference_path=["kingdom"],
        )
    if city.region is not None:
        validate_reference(
            result,
            registry.regions,
            city.region,
            "region",
            reference_type="region",
            reference_path=["region"],
        )


def validate_kingdom_references(
    result: ValidationResult,
    kingdom: Kingdom,
    registry: WorldRegistry,
) -> None:
    """Validate a kingdom's continent, ruler, and capital references."""
    if kingdom.continent is not None:
        validate_reference(result, registry.continents, kingdom.continent, "continent", reference_type="continent", reference_path=["continent"])
    if kingdom.ruler is not None:
        validate_reference(result, registry.npcs, kingdom.ruler, "NPC", reference_type="npc", reference_path=["ruler"])
    if kingdom.capital is not None:
        validate_reference(result, registry.cities, kingdom.capital, "city", reference_type="city", reference_path=["capital"])


def validate_region_references(
    result: ValidationResult,
    region: Region,
    registry: WorldRegistry,
) -> None:
    """Validate a region's kingdom and continent references."""
    if region.kingdom is not None:
        validate_reference(result, registry.kingdoms, region.kingdom, "kingdom", reference_type="kingdom", reference_path=["kingdom"])
    if region.continent is not None:
        validate_reference(result, registry.continents, region.continent, "continent", reference_type="continent", reference_path=["continent"])


def validate_location_references(
    result: ValidationResult,
    location: Location,
    registry: WorldRegistry,
) -> None:
    """Validate a location's geographic hierarchy references."""
    if location.continent is not None:
        validate_reference(result, registry.continents, location.continent, "continent", reference_type="continent", reference_path=["continent"])
    if location.kingdom is not None:
        validate_reference(result, registry.kingdoms, location.kingdom, "kingdom", reference_type="kingdom", reference_path=["kingdom"])
    if location.region is not None:
        validate_reference(result, registry.regions, location.region, "region", reference_type="region", reference_path=["region"])

def validate_campaign_references(
    result: ValidationResult,
    campaign: Campaign,
    registry: WorldRegistry,
) -> None:
    """Validate references contained in a campaign."""
    for index, location_id in enumerate(campaign.locations):
        validate_reference(
            result,
            registry.cities,
            location_id,
            "city",
            reference_type="city",
            reference_path=["locations", index],
        )

    for index, npc_id in enumerate(campaign.npcs):
        validate_reference(
            result,
            registry.npcs,
            npc_id,
            "NPC",
            reference_type="npc",
            reference_path=["npcs", index],
        )

    for index, player_character_id in enumerate(campaign.player_characters):
        validate_reference(
            result,
            registry.player_characters,
            player_character_id,
            "player character",
            reference_type="player_character",
            reference_path=["player_characters", index],
        )
    if isinstance(campaign.story, StoryContent):
        validate_story_content(
            result,
            campaign.story,
            registry,
            ["story"],
        )
    elif isinstance(campaign.story, CampaignStory):
        for action_index, action in enumerate(campaign.story.player_actions):
            for story_index, story_id in enumerate(action.world_stories):
                validate_reference(
                    result,
                    registry.world_stories,
                    story_id,
                    "world story",
                    reference_type="world_story",
                    reference_path=["story", "player_actions", action_index, "world_stories", story_index],
                )
            validate_world_story_thread_links(
                result,
                action.world_story_threads,
                registry,
                ["story", "player_actions", action_index, "world_story_threads"],
            )
        for beat_index, beat in enumerate(campaign.story.beats):
            for story_index, story_id in enumerate(beat.world_stories):
                validate_reference(
                    result,
                    registry.world_stories,
                    story_id,
                    "world story",
                    reference_type="world_story",
                    reference_path=["story", "beats", beat_index, "world_stories", story_index],
                )
            validate_world_story_thread_links(
                result,
                beat.world_story_threads,
                registry,
                ["story", "beats", beat_index, "world_story_threads"],
            )
            for consequence_index, consequence in enumerate(beat.consequences):
                for story_index, story_id in enumerate(consequence.world_stories):
                    validate_reference(
                        result,
                        registry.world_stories,
                        story_id,
                        "world story",
                        reference_type="world_story",
                        reference_path=["story", "beats", beat_index, "consequences", consequence_index, "world_stories", story_index],
                    )
                validate_world_story_thread_links(
                    result,
                    consequence.world_story_threads,
                    registry,
                    ["story", "beats", beat_index, "consequences", consequence_index, "world_story_threads"],
                )
            for field_name, content in (
                ("description_content", beat.description_content),
                ("events_content", beat.events_content),
                ("triggers_content", beat.triggers_content),
                ("possible_approaches_content", beat.possible_approaches_content),
            ):
                if content is not None:
                    validate_story_content(
                        result,
                        content,
                        registry,
                        ["story", "beats", beat_index, field_name],
                    )


def validate_world_event_references(
    result: ValidationResult,
    event: WorldEvent,
    registry: WorldRegistry,
) -> None:
    """Validate references in a world event."""
    for index, campaign_id in enumerate(event.campaigns):
        validate_reference(
            result,
            registry.campaigns,
            campaign_id,
            "campaign",
            reference_type="campaign",
            reference_path=["campaigns", index],
        )
    for index, story_id in enumerate(event.world_stories):
        validate_reference(
            result,
            registry.world_stories,
            story_id,
            "world story",
            reference_type="world_story",
            reference_path=["world_stories", index],
        )
    validate_world_story_thread_links(result, event.world_story_threads, registry, ["world_story_threads"])
    if event.timeline_event_id:
        validate_reference(
            result,
            registry.timeline_events,
            event.timeline_event_id,
            "timeline event",
            reference_type="timeline_event",
            reference_path=["timeline_event_id"],
        )
    for index, location_id in enumerate(event.locations):
        if all(location_id not in collection for collection in (
            registry.cities,
            registry.locations,
            registry.regions,
            registry.kingdoms,
        )):
            result.add_error(
                f"Unknown location ID in world event: {location_id}",
                reference_id=location_id,
                reference_type="location",
                reference_path=["locations", index],
            )
    for index, character_id in enumerate(event.characters):
        if character_id not in registry.npcs and character_id not in registry.player_characters:
            result.add_error(
                f"Unknown character ID in world event: {character_id}",
                reference_id=character_id,
                reference_type="character",
                reference_path=["characters", index],
            )
    for index, source in enumerate(event.story_sources):
        validate_reference(
            result,
            registry.campaigns,
            source.campaign_id,
            "campaign",
            reference_type="campaign",
            reference_path=["story_sources", index, "campaign_id"],
        )


def validate_lore_references(
    result: ValidationResult,
    lore: Lore,
    registry: WorldRegistry,
) -> None:
    """Validate campaign and geographic-knowledge references in lore records."""
    for index, campaign_id in enumerate(lore.campaigns):
        validate_reference(
            result,
            registry.campaigns,
            campaign_id,
            "campaign",
            reference_type="campaign",
            reference_path=["campaigns", index],
        )
    geographic_entities = {
        **registry.continents,
        **registry.kingdoms,
        **registry.regions,
        **registry.cities,
        **registry.locations,
    }
    for index, location_id in enumerate(lore.common_knowledge_locations):
        validate_reference(
            result,
            geographic_entities,
            location_id,
            "location",
            reference_type="location",
            reference_path=["common_knowledge_locations", index],
        )


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
    reference_path: list[str | int] | None = None,
) -> None:
    """Validate World Story and thread references attached to a campaign entity."""
    for index, link in enumerate(links):
        world_story = registry.world_stories.get(link.world_story_id)
        if world_story is None:
            result.add_error(
                f"Unknown world story ID: {link.world_story_id}",
                reference_id=link.world_story_id if reference_path is not None else None,
                reference_type="world_story" if reference_path is not None else None,
                reference_path=[*reference_path, index, "world_story_id"] if reference_path is not None else None,
            )
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

    for index, link in enumerate(event.event_links):
        if link.event_id == event.id:
            result.add_error(
                "A timeline event cannot be connected to itself.",
                reference_id=link.event_id,
                reference_type="event",
                reference_path=["event_links", index, "event_id"],
            )
        elif link.event_id not in registry.timeline_events and link.event_id not in registry.world_events:
            result.add_error(
                f"Unknown event ID: {link.event_id}",
                reference_id=link.event_id,
                reference_type="event",
                reference_path=["event_links", index, "event_id"],
            )

    for index, source in enumerate(event.campaign_sources):
        validate_reference(
            result,
            registry.campaigns,
            source.campaign_id,
            "campaign",
            reference_type="campaign",
            reference_path=["campaign_sources", index, "campaign_id"],
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
    reference_path: list[str | int] | None = None,
) -> None:
    """Validate that a character ID refers to an NPC or player character."""
    if (
        character_id not in registry.npcs
        and character_id not in registry.player_characters
    ):
        result.add_error(
            f"Unknown character ID: {character_id}",
            reference_id=character_id if reference_path is not None else None,
            reference_type="character" if reference_path is not None else None,
            reference_path=reference_path,
        )

def validate_story_content(
    result: ValidationResult,
    story: StoryContent,
    registry: WorldRegistry,
    reference_path: list[str | int] | None = None,
) -> None:
    """Validate entity references contained in story content."""
    for index, node in enumerate(story.nodes):
        if node.type == "entity_link" and registry.get_entity(node.entity_id) is None:
            result.add_error(
                f"Unknown entity ID in story: {node.entity_id}",
                reference_id=node.entity_id if reference_path is not None else None,
                reference_type="entity" if reference_path is not None else None,
                reference_path=[*reference_path, "nodes", index, "entity_id"] if reference_path is not None else None,
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
