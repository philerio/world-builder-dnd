from pathlib import Path

from worldbuilder.loaders.world_loader import load_world_registry


def test_world_loader_loads_continents() -> None:
    world_path = Path("tests/data/test-world/world.yaml")

    registry = load_world_registry(world_path)

    testCont = registry.get_continent("test-continent")

    assert testCont is not None
    assert testCont.name == "Test Continent"

