from pathlib import Path
from datetime import UTC, datetime
from difflib import unified_diff
import hashlib
import json
import re
from typing import TypeVar

from pydantic import BaseModel, ValidationError
import yaml

from worldbuilder.config.entity_directories import ENTITY_DIRECTORIES
from worldbuilder.config.entity_types import get_entity_model
from worldbuilder.loaders.entity_loader import (
    load_yaml_directory,
    save_yaml_entity,
)
from worldbuilder.models.world import World

ModelT = TypeVar("ModelT", bound=BaseModel)
BACKUP_ID_PATTERN = re.compile(r"^\d{8}T\d{12}Z-[a-f0-9]{12}\.yaml$")


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
        directory = self._get_entity_directory(type(entity))

        for path in sorted(directory.glob("*.yaml")):
            with path.open("r", encoding="utf-8") as file:
                data = yaml.safe_load(file)

            if data.get("id") == entity.id:
                return save_yaml_entity(
                    entity,
                    directory,
                    filename=path.name,
                )

        raise FileNotFoundError(
            f"Entity does not exist: {directory / f'{entity.id}.yaml'}"
        )

    def _find_entity_yaml_path(self, entity_id: str, model: type[ModelT]) -> Path:
        if model is World:
            path = self.world_path / "world.yaml"
            if path.exists():
                return path
            raise FileNotFoundError(f"World file does not exist: {path}")

        directory = self._get_entity_directory(model)
        for path in sorted(directory.glob("*.yaml")):
            with path.open("r", encoding="utf-8") as file:
                data = yaml.safe_load(file)
            if isinstance(data, dict) and data.get("id") == entity_id:
                return path

        raise FileNotFoundError(f"Entity does not exist: {directory / f'{entity_id}.yaml'}")

    def read_entity_yaml(self, entity_id: str, model: type[ModelT]) -> tuple[str, Path]:
        """Read the original YAML source for an entity without reformatting it."""
        path = self._find_entity_yaml_path(entity_id, model)
        return path.read_text(encoding="utf-8"), path

    def update_entity_yaml(
        self,
        entity_id: str,
        model: type[ModelT],
        content: str,
    ) -> Path:
        """Validate and save edited YAML while preserving its authored formatting."""
        try:
            data = yaml.safe_load(content)
            if not isinstance(data, dict):
                raise ValueError("YAML content must be an object.")
            entity = model.model_validate(data)
        except (yaml.YAMLError, ValidationError) as exc:
            raise ValueError(f"Invalid YAML for {model.__name__}: {exc}") from exc

        if entity.id != entity_id:
            raise ValueError("The entity ID cannot be changed in the YAML editor.")

        path = self._find_entity_yaml_path(entity_id, model)
        path.write_text(content, encoding="utf-8")
        return path

    def _get_yaml_source(
        self,
        entity_type: str,
        file_name: str,
    ) -> tuple[type[BaseModel], Path]:
        if Path(file_name).name != file_name or not file_name.endswith(".yaml"):
            raise ValueError("A YAML file name is required.")
        if entity_type == "world":
            if file_name != "world.yaml":
                raise ValueError("Only world.yaml can be edited as a world file.")
            model: type[BaseModel] = World
            directory = self.world_path
        else:
            model = get_entity_model(entity_type)  # type: ignore[assignment]
            if model is None or model not in ENTITY_DIRECTORIES:
                raise ValueError(f"Unknown entity type: {entity_type}")
            directory = self._get_entity_directory(model)

        path = directory / file_name
        if path.resolve().parent != directory.resolve():
            raise ValueError("YAML file path is outside the world data directory.")
        if not path.is_file() and entity_type != "world":
            raise FileNotFoundError(f"YAML file does not exist: {path}")
        return model, path

    def read_yaml_source(self, entity_type: str, file_name: str) -> tuple[str, Path]:
        """Read a YAML file by its allow-listed entity directory and file name."""
        _, path = self._get_yaml_source(entity_type, file_name)
        if entity_type == "world" and not path.exists():
            return (
                "# Restore the required world record by filling in these fields.\n"
                "id: \nname: \nversion: '1'\nauthor: \ncontinents: []\n",
                path,
            )
        return path.read_text(encoding="utf-8"), path

    def update_yaml_source(self, entity_type: str, file_name: str, content: str) -> Path:
        """Validate and save a YAML source file, allowing ID repair when needed."""
        model, path = self._get_yaml_source(entity_type, file_name)
        try:
            data = yaml.safe_load(content)
            if not isinstance(data, dict):
                raise ValueError("YAML content must be an object.")
            model.model_validate(data)
        except (yaml.YAMLError, ValidationError) as exc:
            raise ValueError(f"Invalid YAML for {entity_type}: {exc}") from exc

        if path.exists():
            self._store_yaml_backup(entity_type, file_name, path.read_text(encoding="utf-8"))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def preview_yaml_source(
        self,
        entity_type: str,
        file_name: str,
        content: str,
    ) -> dict[str, str | bool]:
        """Validate proposed YAML and return a unified text diff without saving."""
        model, path = self._get_yaml_source(entity_type, file_name)
        current = self.read_yaml_source(entity_type, file_name)[0]
        valid = True
        validation_error = ""
        try:
            data = yaml.safe_load(content)
            if not isinstance(data, dict):
                raise ValueError("YAML content must be an object.")
            model.model_validate(data)
        except (yaml.YAMLError, ValidationError, ValueError) as exc:
            valid = False
            validation_error = f"Invalid YAML for {entity_type}: {exc}"

        diff = "".join(unified_diff(
            current.splitlines(keepends=True),
            content.splitlines(keepends=True),
            fromfile=path.name,
            tofile=f"{path.name} (proposed)",
        ))
        return {
            "valid": valid,
            "validation_error": validation_error,
            "diff": diff,
            "has_changes": current != content,
        }

    def prepare_reference_repair(
        self,
        entity_type: str,
        file_name: str,
        reference_path: list[str | int],
        expected_id: str,
        replacement_id: str,
    ) -> dict[str, str | bool]:
        """Replace one exact YAML scalar and return its validated diff for review."""
        if not reference_path:
            raise ValueError("A reference path is required.")
        content, path = self.read_yaml_source(entity_type, file_name)
        try:
            root = yaml.compose(content)
        except yaml.YAMLError as exc:
            raise ValueError(f"Could not parse the YAML source: {exc}") from exc
        if root is None:
            raise ValueError("The YAML source is empty.")

        node = root
        for part in reference_path:
            if isinstance(part, str) and isinstance(node, yaml.MappingNode):
                next_node = next(
                    (
                        value_node
                        for key_node, value_node in node.value
                        if isinstance(key_node, yaml.ScalarNode) and key_node.value == part
                    ),
                    None,
                )
            elif isinstance(part, int) and not isinstance(part, bool) and isinstance(node, yaml.SequenceNode):
                next_node = node.value[part] if 0 <= part < len(node.value) else None
            else:
                next_node = None
            if next_node is None:
                raise ValueError("The reference path no longer matches this YAML source. Reload Data Health and try again.")
            node = next_node

        if not isinstance(node, yaml.ScalarNode) or node.value != expected_id:
            raise ValueError("The reference value changed since the issue was reported. Reload Data Health and try again.")

        proposed = content[: node.start_mark.index] + json.dumps(replacement_id, ensure_ascii=False) + content[node.end_mark.index :]
        preview = self.preview_yaml_source(entity_type, file_name, proposed)
        return {**preview, "content": proposed, "path": str(path.relative_to(self.world_path))}

    def _yaml_backup_directory(self, entity_type: str, file_name: str) -> Path:
        model, source_path = self._get_yaml_source(entity_type, file_name)
        del model
        return self.world_path / ".yaml_backups" / entity_type / f"{source_path.name}.history"

    def _store_yaml_backup(self, entity_type: str, file_name: str, content: str) -> Path:
        directory = self._yaml_backup_directory(entity_type, file_name)
        directory.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256(content.encode("utf-8")).hexdigest()[:12]
        backup_id = f"{datetime.now(UTC).strftime('%Y%m%dT%H%M%S%fZ')}-{digest}.yaml"
        path = directory / backup_id
        path.write_text(content, encoding="utf-8")
        return path

    def list_yaml_backups(self, entity_type: str, file_name: str) -> list[dict[str, str | int]]:
        directory = self._yaml_backup_directory(entity_type, file_name)
        if not directory.exists():
            return []
        backups = []
        for path in sorted(directory.glob("*.yaml"), reverse=True):
            if not BACKUP_ID_PATTERN.fullmatch(path.name):
                continue
            backups.append({
                "backup_id": path.name,
                "created_at": datetime.fromtimestamp(path.stat().st_mtime, UTC).isoformat(),
                "size": path.stat().st_size,
            })
        return backups

    def restore_yaml_backup(self, entity_type: str, file_name: str, backup_id: str) -> Path:
        if not BACKUP_ID_PATTERN.fullmatch(backup_id):
            raise ValueError("Invalid YAML backup ID.")
        _, source_path = self._get_yaml_source(entity_type, file_name)
        backup_directory = self._yaml_backup_directory(entity_type, file_name)
        backup_path = backup_directory / backup_id
        if backup_path.resolve().parent != backup_directory.resolve() or not backup_path.is_file():
            raise FileNotFoundError(f"YAML backup does not exist: {backup_id}")

        backup_content = backup_path.read_text(encoding="utf-8")
        if source_path.exists():
            self._store_yaml_backup(entity_type, file_name, source_path.read_text(encoding="utf-8"))
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_text(backup_content, encoding="utf-8")
        return source_path

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
