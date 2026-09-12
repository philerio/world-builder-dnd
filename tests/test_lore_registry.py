from worldbuilder.models.lore import Lore
from worldbuilder.registry import WorldRegistry


def test_registry_stores_lore() -> None:
    registry = WorldRegistry()

    lore = Lore(
        id="test-lore",
        name="Test Lore",
        details="A test lore entry.",
    )

    registry.add_lore(lore)

    assert registry.get_lore("test-lore") == lore
    assert registry.has_lore("test-lore")


def test_registry_rejects_duplicate_lore() -> None:
    registry = WorldRegistry()

    lore = Lore(
        id="test-lore",
        name="Test Lore",
    )

    registry.add_lore(lore)

    try:
        registry.add_lore(lore)
        assert False, "Expected duplicate lore ID to raise ValueError"
    except ValueError as exc:
        assert str(exc) == "Duplicate lore ID: test-lore"
