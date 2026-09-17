from pathlib import Path

from worldbuilder.loaders.entity_loader import load_yaml_directory
from worldbuilder.loaders.yaml_loader import load_world
from worldbuilder.models.location import Location
from worldbuilder.models.artifact import Artifact
from worldbuilder.models.city import City
from worldbuilder.models.kingdom import Kingdom
from worldbuilder.models.lore import Lore
from worldbuilder.models.map import Map
from worldbuilder.models.region import Region
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.registry import WorldRegistry
from worldbuilder.models.npc import NPC
from worldbuilder.models.campaign import Campaign
from worldbuilder.models.continent import Continent
from worldbuilder.models.world_event import WorldEvent
from worldbuilder.models.player_character import PlayerCharacter


def load_world_registry(path: Path) -> WorldRegistry:
    """Load a world and its entities into a registry."""
    world = load_world(path)

    registry = WorldRegistry()
    registry.add_world(world)

    for city in load_yaml_directory(path.parent / "cities", City):
        registry.add_city(city)

    for continent in load_yaml_directory(
        path.parent / "continents",
        Continent,
    ):
        registry.add_continent(continent)

    for artifact in load_yaml_directory(path.parent / "artifacts", Artifact):
        registry.add_artifact(artifact)

    for map in load_yaml_directory(path.parent / "maps", Map):
        registry.add_map(map)

    for kingdom in load_yaml_directory(path.parent / "kingdoms", Kingdom):
        registry.add_kingdom(kingdom)

    for region in load_yaml_directory(path.parent / "regions", Region):
        registry.add_region(region)

    for npc in load_yaml_directory(path.parent / "npcs", NPC):
        registry.add_npc(npc)

    for player_character in load_yaml_directory(
        path.parent / "player_characters",
        PlayerCharacter,
    ):
        registry.add_player_character(player_character)
        
    for location in load_yaml_directory(path.parent / "locations", Location):
        registry.add_location(location)
        
    for campaign in load_yaml_directory(path.parent / "campaigns", Campaign):
        registry.add_campaign(campaign)

    for event in load_yaml_directory(path.parent / "events", WorldEvent):
        registry.add_world_event(event)

    for timeline_event in load_yaml_directory(
        path.parent / "timeline",
        TimelineEvent,
    ):
        registry.add_timeline_event(timeline_event)

    for lore in load_yaml_directory(
        path.parent / "lore",
        Lore,
    ):
        registry.add_lore(lore)

    return registry
