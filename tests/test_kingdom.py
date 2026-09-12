from worldbuilder.models.kingdom import Kingdom


def test_create_kingdom() -> None:
    """A kingdom can be created."""
    kingdom = Kingdom(
        id="example-kingdom",
        name="Example Kingdom",
    )

    assert kingdom.id == "example-kingdom"
    assert kingdom.name == "Example Kingdom"


def test_kingdom_optional_details() -> None:
    """A kingdom can have a ruler and capital."""
    kingdom = Kingdom(
        id="example-kingdom",
        name="Example Kingdom",
        ruler="Example Ruler",
        capital="example-capital",
    )

    assert kingdom.ruler == "Example Ruler"
    assert kingdom.capital == "example-capital"