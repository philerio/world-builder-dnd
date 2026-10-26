from copy import deepcopy
from pathlib import Path
from threading import Lock

from worldbuilder.loaders.entity_loader import load_yaml_directory
from worldbuilder.loaders.yaml_loader import load_world
from worldbuilder.models.artifact import Artifact
from worldbuilder.models.campaign import Campaign
from worldbuilder.models.city import City
from worldbuilder.models.continent import Continent
from worldbuilder.models.dm_scratchpad import DmScratchpadEntry
from worldbuilder.models.kingdom import Kingdom
from worldbuilder.models.location import Location
from worldbuilder.models.lore import Lore
from worldbuilder.models.map import Map
from worldbuilder.models.npc import NPC
from worldbuilder.models.player_character import PlayerCharacter
from worldbuilder.models.price_list import PriceList
from worldbuilder.models.region import Region
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.models.world_event import WorldEvent
from worldbuilder.models.world_story import WorldStory
from worldbuilder.registry import WorldRegistry

_ENTITY_DIRECTORIES = (
    "cities",
    "continents",
    "artifacts",
    "maps",
    "kingdoms",
    "regions",
    "npcs",
    "player_characters",
    "locations",
    "campaigns",
    "events",
    "timeline",
    "lore",
    "world_stories",
    "dm_scratchpad",
    "price_lists",
)
_registry_cache: dict[
    Path,
    tuple[tuple[tuple[str, int, int, int], ...], WorldRegistry],
] = {}
_registry_cache_lock = Lock()


def _registry_source_signature(path: Path) -> tuple[tuple[str, int, int, int], ...]:
    sources = [path]
    for directory_name in _ENTITY_DIRECTORIES:
        sources.extend(sorted((path.parent / directory_name).glob("*.yaml")))

    return tuple(
        (
            str(source),
            source.stat().st_size,
            source.stat().st_mtime_ns,
            source.stat().st_ctime_ns,
        )
        for source in sources
    )


def _load_world_registry(path: Path) -> WorldRegistry:
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

    for story in load_yaml_directory(
        path.parent / "world_stories",
        WorldStory,
    ):
        registry.add_world_story(story)

    for entry in load_yaml_directory(path.parent / "dm_scratchpad", DmScratchpadEntry):
        registry.add_dm_scratchpad_entry(entry)

    for price_list in load_yaml_directory(path.parent / "price_lists", PriceList):
        registry.add_price_list(price_list)

    return registry


def load_world_registry(path: Path) -> WorldRegistry:
    """Load a fresh registry snapshot, reusing parsed YAML while sources are unchanged."""
    resolved_path = path.resolve()
    with _registry_cache_lock:
        signature = _registry_source_signature(resolved_path)
        cached = _registry_cache.get(resolved_path)
        if cached and cached[0] == signature:
            registry = cached[1]
        else:
            registry = _load_world_registry(resolved_path)
            _registry_cache[resolved_path] = (signature, registry)

    # Callers sometimes enrich registry models while building responses. Keep each
    # request isolated so one endpoint cannot affect later requests through cache.
    return deepcopy(registry)
