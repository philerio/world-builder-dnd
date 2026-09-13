from pathlib import Path

from worldbuilder.loaders.yaml_loader import load_world, save_yaml
from worldbuilder.models.world import World


def test_save_yaml_round_trip(tmp_path: Path) -> None:
    world = World(
        id="test-world",
        name="Test World",
        description="A world used for testing.",
        version="1.0",
        author="Test Author",
        continents=["test-continent"],
    )

    path = tmp_path / "world.yaml"

    save_yaml(world, path)

    loaded = load_world(path)

    assert loaded == world
