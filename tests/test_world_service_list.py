from pathlib import Path

from worldbuilder.models.lore import Lore
from worldbuilder.services.world_service import WorldService


def test_world_service_lists_entities(tmp_path: Path) -> None:
    service = WorldService(tmp_path)

    first = Lore(
        id="first-lore",
        name="First Lore",
    )
    second = Lore(
        id="second-lore",
        name="Second Lore",
    )

    service.save_entity(first)
    service.save_entity(second)

    entities = service.list_entities(Lore)

    assert len(entities) == 2
    assert {entity.id for entity in entities} == {
        "first-lore",
        "second-lore",
    }
