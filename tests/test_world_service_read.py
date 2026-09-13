from pathlib import Path

from worldbuilder.models.lore import Lore
from worldbuilder.services.world_service import WorldService


def test_world_service_gets_existing_entity(tmp_path: Path) -> None:
    service = WorldService(tmp_path)

    lore = Lore(
        id="test-lore",
        name="Test Lore",
        description="A test entry.",
        details="Some details.",
    )

    service.save_entity(lore)

    loaded = service.get_entity(
        "test-lore",
        Lore,
    )

    assert loaded == lore
    assert loaded.name == "Test Lore"
    assert loaded.details == "Some details."


def test_world_service_get_requires_existing_entity(
    tmp_path: Path,
) -> None:
    service = WorldService(tmp_path)

    try:
        service.get_entity(
            "missing-lore",
            Lore,
        )
        assert False, "Expected FileNotFoundError"
    except FileNotFoundError as exc:
        assert "missing-lore.yaml" in str(exc)
