from worldbuilder.models.city import City


def test_create_city() -> None:
    """A city can be created with basic information."""
    city = City(
        id="reqrun",
        name="Reqrun",
        description="A small town in Batik.",
    )

    assert city.id == "reqrun"
    assert city.name == "Reqrun"
    assert city.description == "A small town in Batik."


def test_city_can_have_optional_details() -> None:
    """A city can store optional kingdom, region, and population."""
    city = City(
        id="reqrun",
        name="Reqrun",
        kingdom="example-kingdom",
        region="batik",
        population=500,
    )

    assert city.kingdom == "example-kingdom"
    assert city.region == "batik"
    assert city.population == 500