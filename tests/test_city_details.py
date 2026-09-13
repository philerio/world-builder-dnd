from pathlib import Path

from worldbuilder.loaders.world_loader import load_world_registry


def test_city_loads_details_and_dm_notes() -> None:
    world_path = Path("tests/data/test-world/world.yaml")

    registry = load_world_registry(world_path)

    city = registry.get_city("test-city")

    assert city is not None
    assert city.details is not None
    assert "automated" in city.details
    assert city.dm_notes is not None
    assert "DM notes" in city.dm_notes
