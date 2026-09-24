from worldbuilder.models.city import City
from worldbuilder.models.npc import NPC
from worldbuilder.registry import WorldRegistry
from worldbuilder.services.id_generator import generate_entity_id


def test_generates_id_from_name_and_type():
    registry = WorldRegistry()

    entity_id = generate_entity_id(
        name="New City",
        model=City,
        registry=registry,
    )

    assert entity_id == "new-city-city"


def test_generates_npc_id():
    registry = WorldRegistry()

    entity_id = generate_entity_id(
        name="Dorith",
        model=NPC,
        registry=registry,
    )

    assert entity_id == "dorith-npc"


def test_adds_suffix_when_id_exists():
    registry = WorldRegistry()

    existing_city = City(
        id="new-city-city",
        name="Existing City",
    )
    registry.add_city(existing_city)

    entity_id = generate_entity_id(
        name="New City",
        model=City,
        registry=registry,
    )

    assert entity_id == "new-city-city-2"
