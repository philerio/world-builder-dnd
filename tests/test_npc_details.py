from pathlib import Path

from worldbuilder.loaders.world_loader import load_world_registry


def test_stratos_npcs_load_details_and_relationships() -> None:
    world_path = Path("worlds/elligaesia/world.yaml")

    registry = load_world_registry(world_path)

    dorith = registry.get_npc("dorith")
    assert dorith is not None
    assert dorith.details is not None
    assert "High Elf" in dorith.details
    assert any(
        relationship.character == "elorith"
        and relationship.relationship == "sister"
        for relationship in dorith.relationships
    )

    aerick = registry.get_npc("aerick")
    assert aerick is not None
    assert aerick.details is not None
    assert "Dwarmar" in aerick.details

    elorith = registry.get_npc("elorith")
    assert elorith is not None
    assert elorith.details is not None
    assert any(
        relationship.character == "aerith"
        and relationship.relationship == "daughter"
        for relationship in elorith.relationships
    )
