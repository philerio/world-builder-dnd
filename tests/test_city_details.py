from pathlib import Path

from worldbuilder.loaders.world_loader import load_world_registry


def test_city_loads_details_and_dm_notes() -> None:
    world_path = Path("worlds/elligaesia/world.yaml")

    registry = load_world_registry(world_path)

    city = registry.get_city("stratos")

    assert city is not None
    assert city.details is not None
    assert "High Elf" in city.details
    assert city.dm_notes is not None
    assert "Aerick" in city.dm_notes
