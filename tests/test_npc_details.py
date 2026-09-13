from pathlib import Path

from worldbuilder.loaders.world_loader import load_world_registry


def test_stratos_npcs_load_details_and_relationships() -> None:
    world_path = Path("tests/data/test-world/world.yaml")

    registry = load_world_registry(world_path)

    testNpc = registry.get_npc("test-npc")
    assert testNpc is not None
    assert testNpc.details is not None
    assert "High Elf" in testNpc.details
    assert any(
        relationship.character == "test-mother"
        and relationship.relationship == "mother"
        for relationship in testNpc.relationships
    )

