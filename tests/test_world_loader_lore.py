from pathlib import Path

from worldbuilder.loaders.world_loader import load_world_registry


def test_world_loader_loads_lore() -> None:
    world_path = Path("worlds/elligaesia/world.yaml")

    registry = load_world_registry(world_path)

    lore = registry.get_lore("high-elf-naming-convention")

    assert lore is not None
    assert lore.name == "High Elf Naming Convention"
    assert lore.details is not None

    mechanism = registry.get_lore("stratos-dwarmar-mechanism")

    assert mechanism is not None
    assert mechanism.name == "Stratos Dwarmar Mechanism"
    assert mechanism.details is not None
