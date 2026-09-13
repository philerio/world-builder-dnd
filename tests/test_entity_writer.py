from pathlib import Path

from worldbuilder.loaders.entity_loader import (
    load_yaml_directory,
    save_yaml_entity,
)
from worldbuilder.models.lore import Lore


def test_save_yaml_entity(tmp_path: Path) -> None:
    lore = Lore(
        id="test-lore",
        name="Test Lore",
        description="A test entry.",
        details="Some details.",
    )

    path = save_yaml_entity(lore, tmp_path)

    assert path == tmp_path / "test-lore.yaml"
    assert path.exists()

    loaded = load_yaml_directory(tmp_path, Lore)

    assert len(loaded) == 1
    assert loaded[0] == lore
