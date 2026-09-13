from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def insert_once(path: Path, marker: str, content: str) -> None:
    """Insert content after marker if it isn't already present."""
    text = path.read_text(encoding="utf-8")

    if content.strip() in text:
        return

    if marker not in text:
        raise RuntimeError(
            f"Could not find marker in {path}: {marker!r}"
        )

    text = text.replace(
        marker,
        marker + content,
        1,
    )

    path.write_text(text, encoding="utf-8")


def create_file(path: Path, content: str) -> None:
    """Create a file without overwriting an existing file."""
    if path.exists():
        print(f"Already exists, skipping: {path}")
        return

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"Created: {path}")


def main() -> None:
    # ------------------------------------------------------------
    # 1. Continent model
    # ------------------------------------------------------------

    create_file(
        ROOT / "worldbuilder/models/continent.py",
        '''from .base import WorldObject


class Continent(WorldObject):
    """A major landmass within the world."""

    details: str | None = None
    dm_notes: str | None = None
''',
    )

    # ------------------------------------------------------------
    # 2. Registry
    # ------------------------------------------------------------

    registry = ROOT / "worldbuilder/registry/registry.py"

    insert_once(
        registry,
        "from worldbuilder.models.campaign import Campaign\n",
        "from worldbuilder.models.continent import Continent\n",
    )

    insert_once(
        registry,
        "        self.campaigns: dict[str, Campaign] = {}\n",
        "        self.continents: dict[str, Continent] = {}\n",
    )

    insert_once(
        registry,
        "    def add_campaign(self, campaign: Campaign) -> None:\n",
        '''    def add_continent(self, continent: Continent) -> None:
        """Add a continent to the registry."""
        if continent.id in self.continents:
            raise ValueError(
                f"Duplicate continent ID: {continent.id}"
            )

        self.continents[continent.id] = continent

    def get_continent(self, continent_id: str) -> Continent | None:
        """Get a continent by ID."""
        return self.continents.get(continent_id)

    def has_continent(self, continent_id: str) -> bool:
        """Check whether a continent exists."""
        return continent_id in self.continents

''',
    )

    # ------------------------------------------------------------
    # 3. World loader
    # ------------------------------------------------------------

    loader = ROOT / "worldbuilder/loaders/world_loader.py"

    insert_once(
        loader,
        "from worldbuilder.models.campaign import Campaign\n",
        "from worldbuilder.models.continent import Continent\n",
    )

    insert_once(
        loader,
        '    for city in load_yaml_directory(path.parent / "cities", City):\n',
        '''    for continent in load_yaml_directory(
        path.parent / "continents",
        Continent,
    ):
        registry.add_continent(continent)

''',
    )

    # ------------------------------------------------------------
    # 4. Entity directory mapping
    # ------------------------------------------------------------

    mapping = ROOT / "worldbuilder/config/entity_directories.py"

    insert_once(
        mapping,
        "from worldbuilder.models.campaign import Campaign\n",
        "from worldbuilder.models.continent import Continent\n",
    )

    insert_once(
        mapping,
        'ENTITY_DIRECTORIES: dict[type, str] = {\n',
        '    Continent: "continents",\n',
    )

    # ------------------------------------------------------------
    # 5. Continent directory + initial records
    # ------------------------------------------------------------

    continent_dir = ROOT / "worlds/elligaesia/continents"
    continent_dir.mkdir(parents=True, exist_ok=True)

    create_file(
        continent_dir / "elligaesia.yaml",
        '''id: elligaesia
name: Elligaesia
description: >
  A continent within the world of Elligaesia.
details: null
dm_notes: null
''',
    )

    create_file(
        continent_dir / "rendelle.yaml",
        '''id: rendelle
name: Rendelle
description: >
  A continent within the world of Elligaesia.
details: null
dm_notes: null
''',
    )

    # ------------------------------------------------------------
    # 6. Registry test
    # ------------------------------------------------------------

    create_file(
        ROOT / "tests/test_continent_registry.py",
        '''from worldbuilder.models.continent import Continent
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
''',
    )

    # ------------------------------------------------------------
    # 7. Loader test
    # ------------------------------------------------------------

    create_file(
        ROOT / "tests/test_world_loader_continents.py",
        '''from pathlib import Path

from worldbuilder.loaders.world_loader import load_world_registry


def test_world_loader_loads_continents() -> None:
    world_path = Path("worlds/elligaesia/world.yaml")

    registry = load_world_registry(world_path)

    elligaesia = registry.get_continent("elligaesia")
    rendelle = registry.get_continent("rendelle")

    assert elligaesia is not None
    assert elligaesia.name == "Elligaesia"

    assert rendelle is not None
    assert rendelle.name == "Rendelle"
''',
    )

    print("\nContinents setup complete.")


if __name__ == "__main__":
    main()
