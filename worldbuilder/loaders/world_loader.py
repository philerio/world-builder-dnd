from pathlib import Path

from worldbuilder.loaders.entity_loader import load_yaml_directory
from worldbuilder.loaders.yaml_loader import load_world
from worldbuilder.models.city import City
from worldbuilder.models.kingdom import Kingdom
from worldbuilder.models.region import Region
from worldbuilder.registry import WorldRegistry


def load_world_registry(path: Path) -> WorldRegistry:
    """Load a world and its entities into a registry."""
    world = load_world(path)

    registry = WorldRegistry()
    registry.add_world(world)

    for city in load_yaml_directory(path.parent / "cities", City):
        registry.add_city(city)

    for kingdom in load_yaml_directory(path.parent / "kingdoms", Kingdom):
        registry.add_kingdom(kingdom)

    for region in load_yaml_directory(path.parent / "regions", Region):
        registry.add_region(region)

    return registry