import pytest
from worldbuilder.models.artifact import Artifact
from worldbuilder.models.campaign import Campaign
from worldbuilder.models.map import Map
from worldbuilder.models.reference import EntityReference
from worldbuilder.models.region import Region

from worldbuilder.models.kingdom import Kingdom
from worldbuilder.models.world import World
from worldbuilder.registry import WorldRegistry
from pathlib import Path

from worldbuilder.loaders.world_loader import load_world_registry
from worldbuilder.models.city import City
from worldbuilder.models.npc import NPC
from worldbuilder.registry.reference_resolver import resolve_reference


def make_world(world_id: str = "elligaesia") -> World:
    return World(
        id=world_id,
        name="Elligaesia",
        description="A high fantasy world.",
        version="1.0",
        author="Patrick",
        continents=["elligaesia", "batik", "rendelle"],
    )


def test_add_and_get_world() -> None:
    """A world can be added and retrieved by ID."""
    registry = WorldRegistry()
    world = make_world()

    registry.add_world(world)

    assert registry.get_world("elligaesia") == world


def test_has_world() -> None:
    """The registry can determine whether a world exists."""
    registry = WorldRegistry()

    registry.add_world(make_world())

    assert registry.has_world("elligaesia")
    assert not registry.has_world("batik")


def test_missing_world_returns_none() -> None:
    """Looking up a missing world returns None."""
    registry = WorldRegistry()

    assert registry.get_world("does-not-exist") is None


def test_duplicate_world_id_raises_error() -> None:
    """Two worlds cannot have the same ID."""
    registry = WorldRegistry()

    registry.add_world(make_world())

    with pytest.raises(ValueError, match="Duplicate world ID"):
        registry.add_world(make_world())

def test_load_world_registry() -> None:
    """A world YAML file can be loaded directly into a registry."""
    path = Path("tests/data/test-world/world.yaml")

    registry = load_world_registry(path)

    world = registry.get_world("test-world")

    assert world is not None
    assert world.name == "Test World"
    assert world.version == "1.0"
    
def test_add_and_get_city() -> None:
    """A city can be added and retrieved by ID."""
    registry = WorldRegistry()

    city = City(
        id="reqrun",
        name="Reqrun",
    )

    registry.add_city(city)

    assert registry.get_city("reqrun") == city


def test_has_city() -> None:
    """The registry can determine whether a city exists."""
    registry = WorldRegistry()

    registry.add_city(
        City(
            id="reqrun",
            name="Reqrun",
        )
    )

    assert registry.has_city("reqrun")
    assert not registry.has_city("unknown-city")


def test_duplicate_city_id_raises_error() -> None:
    """Two cities cannot have the same ID."""
    registry = WorldRegistry()

    city = City(
        id="reqrun",
        name="Reqrun",
    )

    registry.add_city(city)

    with pytest.raises(ValueError, match="Duplicate city ID"):
        registry.add_city(city)
        
def test_load_world_registry_includes_cities() -> None:
    """Loading a world also loads its city files."""
    registry = load_world_registry(
        Path("tests/data/test-world/world.yaml")
    )

    city = registry.get_city("test-city")

    assert city is not None
    assert city.name == "Test City"
    
def test_add_and_get_kingdom() -> None:
    """A kingdom can be added and retrieved by ID."""
    registry = WorldRegistry()

    kingdom = Kingdom(
        id="example-kingdom",
        name="Example Kingdom",
    )

    registry.add_kingdom(kingdom)

    assert registry.get_kingdom("example-kingdom") == kingdom


def test_has_kingdom() -> None:
    """The registry can determine whether a kingdom exists."""
    registry = WorldRegistry()

    registry.add_kingdom(
        Kingdom(
            id="example-kingdom",
            name="Example Kingdom",
        )
    )

    assert registry.has_kingdom("example-kingdom")
    assert not registry.has_kingdom("unknown-kingdom")


def test_duplicate_kingdom_id_raises_error() -> None:
    """Two kingdoms cannot have the same ID."""
    registry = WorldRegistry()

    kingdom = Kingdom(
        id="example-kingdom",
        name="Example Kingdom",
    )

    registry.add_kingdom(kingdom)

    with pytest.raises(ValueError, match="Duplicate kingdom ID"):
        registry.add_kingdom(kingdom)
        
def test_load_world_registry_includes_kingdoms(tmp_path: Path) -> None:
    """Loading a world also loads its kingdom files."""
    world_path = tmp_path / "world.yaml"
    kingdoms_path = tmp_path / "kingdoms"
    kingdoms_path.mkdir()

    world_path.write_text(
        """
id: test-world
name: Test World
description: A test world.
version: "1.0"
author: Test
continents:
  - test-continent
""",
        encoding="utf-8",
    )

    (kingdoms_path / "example.yaml").write_text(
        """
id: example-kingdom
name: Example Kingdom
ruler: Example Ruler
capital: example-capital
""",
        encoding="utf-8",
    )

    registry = load_world_registry(world_path)

    kingdom = registry.get_kingdom("example-kingdom")

    assert kingdom is not None
    assert kingdom.name == "Example Kingdom"
    assert kingdom.ruler == "Example Ruler"
    assert kingdom.capital == "example-capital"
    
def test_add_and_get_region() -> None:
    """A region can be added and retrieved by ID."""
    registry = WorldRegistry()

    region = Region(
        id="example-region",
        name="Example Region",
    )

    registry.add_region(region)

    assert registry.get_region("example-region") == region


def test_has_region() -> None:
    """The registry can determine whether a region exists."""
    registry = WorldRegistry()

    registry.add_region(
        Region(
            id="example-region",
            name="Example Region",
        )
    )

    assert registry.has_region("example-region")
    assert not registry.has_region("unknown-region")


def test_duplicate_region_id_raises_error() -> None:
    """Two regions cannot have the same ID."""
    registry = WorldRegistry()

    region = Region(
        id="example-region",
        name="Example Region",
    )

    registry.add_region(region)

    with pytest.raises(ValueError, match="Duplicate region ID"):
        registry.add_region(region)
        
def test_load_world_registry_includes_regions(tmp_path: Path) -> None:
    """Loading a world also loads its region files."""
    world_path = tmp_path / "world.yaml"
    regions_path = tmp_path / "regions"
    regions_path.mkdir()

    world_path.write_text(
        """
id: test-world
name: Test World
description: A test world.
version: "1.0"
author: Test
continents:
  - test-continent
""",
        encoding="utf-8",
    )

    (regions_path / "example.yaml").write_text(
        """
id: example-region
name: Example Region
kingdom: example-kingdom
continent: test-continent
""",
        encoding="utf-8",
    )

    registry = load_world_registry(world_path)

    region = registry.get_region("example-region")

    assert region is not None
    assert region.name == "Example Region"
    assert region.kingdom == "example-kingdom"
    assert region.continent == "test-continent"
    
def test_add_and_get_npc() -> None:
    """An NPC can be added and retrieved by ID."""
    registry = WorldRegistry()

    npc = NPC(
        id="bill",
        name='William "Bill"',
        role="farmer",
    )

    registry.add_npc(npc)

    assert registry.get_npc("bill") == npc


def test_has_npc() -> None:
    """The registry can determine whether an NPC exists."""
    registry = WorldRegistry()

    registry.add_npc(
        NPC(
            id="bill",
            name='William "Bill"',
        )
    )

    assert registry.has_npc("bill")
    assert not registry.has_npc("unknown-npc")


def test_duplicate_npc_id_raises_error() -> None:
    """Two NPCs cannot have the same ID."""
    registry = WorldRegistry()

    npc = NPC(
        id="bill",
        name='William "Bill"',
    )

    registry.add_npc(npc)

    with pytest.raises(ValueError, match="Duplicate NPC ID"):
        registry.add_npc(npc)
        
def test_load_world_registry_includes_npcs(tmp_path: Path) -> None:
    """Loading a world also loads its NPC files."""
    world_path = tmp_path / "world.yaml"
    npcs_path = tmp_path / "npcs"
    npcs_path.mkdir()

    world_path.write_text(
        """
id: test-world
name: Test World
description: A test world.
version: "1.0"
author: Test
continents:
  - test-continent
""",
        encoding="utf-8",
    )

    (npcs_path / "example.yaml").write_text(
        """
id: example-npc
name: Example NPC
role: farmer
city: example-city
""",
        encoding="utf-8",
    )

    registry = load_world_registry(world_path)

    npc = registry.get_npc("example-npc")

    assert npc is not None
    assert npc.name == "Example NPC"
    assert npc.role == "farmer"
    assert npc.city == "example-city"
    
def test_test_world_registry_contains_test_npc() -> None:
    """The Test World registry contains the test NPC."""
    registry = load_world_registry(
        Path("tests/data/test-world/world.yaml")
    )

    bill = registry.get_npc("test-npc")

    assert bill is not None
    assert bill.name == 'Test NPC'
    assert bill.role == "Test NPC"
    assert bill.city == "test-city"

def test_add_player_character() -> None:
    from worldbuilder.models.player_character import PlayerCharacter

    registry = WorldRegistry()
    character = PlayerCharacter(
        id="aerith",
        name="Aerith",
    )

    registry.add_player_character(character)

    assert registry.get_player_character("aerith") == character
    assert registry.has_player_character("aerith")


def test_duplicate_player_character_id_raises() -> None:
    from worldbuilder.models.player_character import PlayerCharacter

    registry = WorldRegistry()

    registry.add_player_character(
        PlayerCharacter(
            id="aerith",
            name="Aerith",
        )
    )

    try:
        registry.add_player_character(
            PlayerCharacter(
                id="aerith",
                name="Another Aerith",
            )
        )
        assert False, "Expected duplicate player character ID to raise"
    except ValueError as error:
        assert str(error) == "Duplicate player character ID: aerith"

def test_get_entity_finds_entities_across_collections() -> None:
    registry = WorldRegistry()

    city = City(
        id="reqrun",
        name="Reqrun",
    )

    registry.add_city(city)

    assert registry.get_entity("reqrun") == city

def test_get_entity_returns_none_for_unknown_id() -> None:
    registry = WorldRegistry()

    assert registry.get_entity("does-not-exist") is None
     
def test_missing_player_character_returns_none() -> None:
    registry = WorldRegistry()

    assert registry.get_player_character("missing") is None
    assert not registry.has_player_character("missing")
    
def test_duplicate_id_across_entity_types_raises() -> None:
    registry = WorldRegistry()

    registry.add_city(
        City(
            id="shared-id",
            name="Example City",
        )
    )

    from worldbuilder.models.npc import NPC

    try:
        registry.add_npc(
            NPC(
                id="shared-id",
                name="Example NPC",
            )
        )
        assert False, "Expected duplicate entity ID to raise"
    except ValueError as error:
        assert str(error) == (
            "Duplicate entity ID across registry: shared-id"
        )
        
def test_registry_persists_entities_between_add_calls() -> None:
    registry = WorldRegistry()

    city = City(
        id="shared-id",
        name="Example City",
    )

    registry.add_city(city)

    assert "shared-id" in registry.cities
    assert registry.get_city("shared-id") == city

    from worldbuilder.models.npc import NPC

    npc = NPC(
        id="different-id",
        name="Example NPC",
    )

    registry.add_npc(npc)

    assert "shared-id" in registry.cities
    assert registry.get_city("shared-id") == city
    assert "different-id" in registry.npcs
    assert registry.get_npc("different-id") == npc
    
def test_duplicate_id_between_player_character_and_npc_raises() -> None:
    from worldbuilder.models.npc import NPC
    from worldbuilder.models.player_character import PlayerCharacter

    registry = WorldRegistry()

    registry.add_player_character(
        PlayerCharacter(
            id="shared-id",
            name="Example Character",
        )
    )

    try:
        registry.add_npc(
            NPC(
                id="shared-id",
                name="Example NPC",
            )
        )
        assert False, "Expected duplicate entity ID to raise"
    except ValueError as error:
        assert str(error) == (
            "Duplicate entity ID across registry: shared-id"
        )

def test_registry_can_identify_entity_type():
    registry = WorldRegistry()

    registry.add_npc(
        NPC(
            id="test-npc",
            name="Test NPC",
        )
    )

    registry.add_campaign(
        Campaign(
            id="test-campaign",
            name="Test Campaign",
        )
    )

    assert registry.get_entity_type("test-npc") == "npc"
    assert registry.get_entity_type("test-campaign") == "campaign"
    assert registry.get_entity_type("missing") is None
    
def test_registry_can_store_artifacts():
    registry = WorldRegistry()

    artifact = Artifact(
        id="test-artifact",
        name="Test Artifact",
    )

    registry.add_artifact(artifact)

    assert registry.get_artifact("test-artifact") is artifact
    assert registry.has_artifact("test-artifact")
    assert registry.get_entity_type("test-artifact") == "artifact"
    
def test_registry_can_identify_entity_type():
    registry = WorldRegistry()

    registry.add_npc(
        NPC(
            id="test-npc",
            name="Test NPC",
        )
    )

    registry.add_campaign(
        Campaign(
            id="test-campaign",
            name="Test Campaign",
        )
    )

    registry.add_artifact(
        Artifact(
            id="test-artifact",
            name="Test Artifact",
        )
    )

    assert registry.get_entity_type("test-npc") == "npc"
    assert registry.get_entity_type("test-campaign") == "campaign"
    assert registry.get_entity_type("test-artifact") == "artifact"
    assert registry.get_entity_type("missing") is None

def test_resolve_reference_returns_entity():
    registry = WorldRegistry()

    artifact = Artifact(
        id="test-artifact",
        name="Test Artifact",
    )

    registry.add_artifact(artifact)

    reference = resolve_reference(
        registry,
        "test-artifact",
    )

    assert reference is not None
    assert reference.id == "test-artifact"
    assert reference.entity_type == "artifact"
    assert reference.entity is artifact

def test_resolve_reference_returns_none_for_unknown_id():
    registry = WorldRegistry()

    assert resolve_reference(
        registry,
        "does-not-exist",
    ) is None

def test_registry_can_store_maps() -> None:
    registry = WorldRegistry()

    world_map = Map(
        id="test-map",
        name="Test Map",
        map_type="world",
    )

    registry.add_map(world_map)

    assert registry.get_map("test-map") is world_map
    assert registry.has_map("test-map")
    assert registry.get_entity("test-map") is world_map
    assert registry.get_entity_type("test-map") == "map"