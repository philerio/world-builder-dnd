from worldbuilder.models.npc import NPC


def test_create_npc() -> None:
    """An NPC can be created with basic information."""
    npc = NPC(
        id="bill",
        name='William "Bill"',
        role="farmer",
    )

    assert npc.id == "bill"
    assert npc.name == 'William "Bill"'
    assert npc.role == "farmer"


def test_npc_location_references_are_optional() -> None:
    """An NPC can reference a city, region, and kingdom."""
    npc = NPC(
        id="bill",
        name='William "Bill"',
        role="farmer",
        city="reqrun",
        region="example-region",
        kingdom="example-kingdom",
    )

    assert npc.city == "reqrun"
    assert npc.region == "example-region"
    assert npc.kingdom == "example-kingdom"