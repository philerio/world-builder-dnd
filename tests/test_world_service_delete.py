from pathlib import Path

from worldbuilder.models.lore import Lore
from worldbuilder.services.world_service import WorldService


def test_world_service_deletes_existing_entity(tmp_path: Path) -> None:
    service = WorldService(tmp_path)

    lore = Lore(
        id="test-lore",
        name="Test Lore",
        description="A test entry.",
    )

    path = service.save_entity(lore)

    assert path.exists()

    service.delete_entity("test-lore", Lore)

    assert not path.exists()


def test_world_service_delete_requires_existing_entity(
    tmp_path: Path,
) -> None:
    service = WorldService(tmp_path)

    try:
        service.delete_entity("missing-lore", Lore)
        assert False, "Expected FileNotFoundError"
    except FileNotFoundError as exc:
        assert "missing-lore.yaml" in str(exc)
