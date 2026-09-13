from pathlib import Path

from worldbuilder.models.lore import Lore
from worldbuilder.services.world_service import WorldService


def test_world_service_saves_entity(tmp_path: Path) -> None:
    service = WorldService(tmp_path)

    lore = Lore(
        id="test-lore",
        name="Test Lore",
        description="A test entry.",
    )

    path = service.save_entity(lore)

    assert path == tmp_path / "lore" / "test-lore.yaml"
    assert path.exists()
