from worldbuilder.models.region import Region


def test_create_region() -> None:
    """A region can be created."""
    region = Region(
        id="example-region",
        name="Example Region",
    )

    assert region.id == "example-region"
    assert region.name == "Example Region"


def test_region_optional_details() -> None:
    """A region can have a kingdom and continent."""
    region = Region(
        id="example-region",
        name="Example Region",
        kingdom="example-kingdom",
        continent="batik",
    )

    assert region.kingdom == "example-kingdom"
    assert region.continent == "batik"