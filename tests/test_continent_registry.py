from worldbuilder.models.continent import Continent
from worldbuilder.registry import WorldRegistry


def test_registry_stores_continent() -> None:
    registry = WorldRegistry()

    continent = Continent(
        id="test-continent",
        name="Test Continent",
    )

    registry.add_continent(continent)

    assert registry.get_continent("test-continent") == continent
    assert registry.has_continent("test-continent")


def test_registry_rejects_duplicate_continent() -> None:
    registry = WorldRegistry()

    continent = Continent(
        id="test-continent",
        name="Test Continent",
    )

    registry.add_continent(continent)

    try:
        registry.add_continent(continent)
        assert False, "Expected duplicate continent ID to raise ValueError"
    except ValueError as exc:
        assert str(exc) == "Duplicate continent ID: test-continent"
