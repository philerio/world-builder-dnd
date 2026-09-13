from pathlib import Path

from worldbuilder.loaders.entity_loader import load_yaml_directory
from worldbuilder.models.lore import Lore
from worldbuilder.services.world_service import WorldService


def test_world_service_updates_existing_entity(tmp_path: Path) -> None:
    service = WorldService(tmp_path)

    original = Lore(
        id="test-lore",
        name="Original Lore",
        description="Original description.",
    )

    service.save_entity(original)

    updated = Lore(
        id="test-lore",
        name="Updated Lore",
        description="Updated description.",
    )

    path = service.update_entity(updated)

    assert path == tmp_path / "lore" / "test-lore.yaml"

    loaded = load_yaml_directory(tmp_path / "lore", Lore)

    assert len(loaded) == 1
    assert loaded[0] == updated


def test_world_service_update_requires_existing_entity(
    tmp_path: Path,
) -> None:
    service = WorldService(tmp_path)

    lore = Lore(
        id="missing-lore",
        name="Missing Lore",
    )

    try:
        service.update_entity(lore)
        assert False, "Expected FileNotFoundError"
    except FileNotFoundError as exc:
        assert "missing-lore.yaml" in str(exc)
