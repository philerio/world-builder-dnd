from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

from worldbuilder.config.entity_directories import ENTITY_DIRECTORIES
from worldbuilder.loaders.entity_loader import (
    load_yaml_directory,
    save_yaml_entity,
)

ModelT = TypeVar("ModelT", bound=BaseModel)


class WorldService:
    """Manage persistent world entities."""

    def __init__(self, world_path: Path) -> None:
        self.world_path = world_path

    def _get_entity_directory(self, model: type[ModelT]) -> Path:
        """Get the filesystem directory for an entity model."""
        if model not in ENTITY_DIRECTORIES:
            raise ValueError(
                f"No directory configured for model: {model.__name__}"
            )

        return self.world_path / ENTITY_DIRECTORIES[model]

    def save_entity(self, entity: ModelT) -> Path:
        """Save an entity to its configured world directory."""
        directory = self._get_entity_directory(type(entity))

        return save_yaml_entity(entity, directory)

    def get_entity(
        self,
        entity_id: str,
        model: type[ModelT],
    ) -> ModelT:
        """Load an entity by ID from its configured world directory."""
        directory = self._get_entity_directory(model)
        path = directory / f"{entity_id}.yaml"

        if not path.exists():
            raise FileNotFoundError(
                f"Entity does not exist: {path}"
            )

        entities = load_yaml_directory(directory, model)

        for entity in entities:
            if entity.id == entity_id:
                return entity

        raise FileNotFoundError(
            f"Entity does not exist: {path}"
        )

    def update_entity(self, entity: ModelT) -> Path:
        """Update an existing entity."""
        directory = self._get_entity_directory(type(entity))
        path = directory / f"{entity.id}.yaml"

        if not path.exists():
            raise FileNotFoundError(
                f"Entity does not exist: {path}"
            )

        return save_yaml_entity(entity, directory)

    def delete_entity(
        self,
        entity_id: str,
        model: type[ModelT],
    ) -> None:
        """Delete an existing entity."""
        directory = self._get_entity_directory(model)
        path = directory / f"{entity_id}.yaml"

        if not path.exists():
            raise FileNotFoundError(
                f"Entity does not exist: {path}"
            )

        path.unlink()

    def list_entities(
        self,
        model: type[ModelT],
    ) -> list[ModelT]:
        """Load all entities of a given type."""
        directory = self._get_entity_directory(model)

        return load_yaml_directory(
            directory,
            model,
        )