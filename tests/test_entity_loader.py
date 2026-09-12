from pathlib import Path

from pydantic import BaseModel

from worldbuilder.loaders.entity_loader import load_yaml_directory


class TestEntity(BaseModel):
    id: str
    name: str


def test_load_yaml_directory(tmp_path: Path) -> None:
    """All YAML files in a directory are loaded."""
    directory = tmp_path / "entities"
    directory.mkdir()

    (directory / "one.yaml").write_text(
        """
id: one
name: First Entity
""",
        encoding="utf-8",
    )

    (directory / "two.yaml").write_text(
        """
id: two
name: Second Entity
""",
        encoding="utf-8",
    )

    entities = load_yaml_directory(directory, TestEntity)

    assert len(entities) == 2
    assert entities[0].id == "one"
    assert entities[0].name == "First Entity"
    assert entities[1].id == "two"
    assert entities[1].name == "Second Entity"


def test_missing_directory_returns_empty_list(tmp_path: Path) -> None:
    """A missing directory produces no entities."""
    directory = tmp_path / "does-not-exist"

    entities = load_yaml_directory(directory, TestEntity)

    assert entities == []