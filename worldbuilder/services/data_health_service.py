from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, ValidationError

from worldbuilder.config.entity_directories import ENTITY_DIRECTORIES
from worldbuilder.config.entity_types import get_entity_type
from worldbuilder.models.world import World


def _relative_path(path: Path, world_directory: Path) -> str:
    return path.relative_to(world_directory).as_posix()


def _format_validation_error(path: str, error: ValidationError) -> str:
    details = []
    for item in error.errors():
        field = ".".join(str(part) for part in item.get("loc", ())) or "record"
        details.append(f"{field}: {item.get('msg', 'invalid value')}")
    return f"Invalid entity data in {path}: {'; '.join(details)}"


def scan_yaml_sources(world_path: Path) -> list[dict[str, str]]:
    """Find YAML files that cannot be parsed or validated as their entity model."""
    world_directory = world_path.parent
    candidates: list[tuple[str, str, Path, type[BaseModel]]] = [
        ("world", "world.yaml", world_path, World),
    ]
    for model, directory_name in ENTITY_DIRECTORIES.items():
        entity_type = get_entity_type(model)
        if entity_type is None:
            continue
        directory = world_directory / directory_name
        candidates.extend(
            (entity_type, path.name, path, model)
            for path in sorted(directory.glob("*.yaml"))
        )

    issues: list[dict[str, str]] = []
    parsed_entities: list[tuple[str, str, str]] = []

    for entity_type, file_name, path, model in candidates:
        relative_path = _relative_path(path, world_directory)
        source = {
            "source_type": entity_type,
            "file_name": file_name,
            "source_path": relative_path,
        }

        if not path.exists():
            issues.append({
                **source,
                "message": f"Missing required world file: {relative_path}",
                "severity": "error",
            })
            continue

        try:
            with path.open("r", encoding="utf-8") as file:
                data: Any = yaml.safe_load(file)
        except (OSError, yaml.YAMLError) as exc:
            problem = getattr(exc, "problem", None) or str(exc)
            issues.append({
                **source,
                "message": f"Could not parse {relative_path}: {problem}",
                "severity": "error",
            })
            continue

        if not isinstance(data, dict):
            issues.append({
                **source,
                "message": f"Expected a YAML object in {relative_path}.",
                "severity": "error",
            })
            continue

        try:
            entity = model.model_validate(data)
        except ValidationError as exc:
            source_id = data.get("id")
            if isinstance(source_id, str):
                source["source_id"] = source_id
            issues.append({
                **source,
                "message": _format_validation_error(relative_path, exc),
                "severity": "error",
            })
            continue

        parsed_entities.append((entity.id, entity_type, relative_path))

    locations_by_id: dict[str, list[tuple[str, str]]] = {}
    for entity_id, entity_type, path in parsed_entities:
        locations_by_id.setdefault(entity_id, []).append((entity_type, path))

    for entity_id, sources in locations_by_id.items():
        if len(sources) < 2:
            continue
        for entity_type, path in sources:
            file_name = Path(path).name
            other_paths = ", ".join(other_path for _, other_path in sources if other_path != path)
            issues.append({
                "source_type": entity_type,
                "source_id": entity_id,
                "file_name": file_name,
                "source_path": path,
                "message": f"Duplicate entity ID '{entity_id}' in {path}; also used by {other_paths}.",
                "severity": "error",
            })

    return issues


def index_yaml_sources(world_path: Path) -> dict[tuple[str, str], dict[str, str]]:
    """Map loaded entity IDs to their authored YAML paths for actionable issues."""
    world_directory = world_path.parent
    candidates: list[tuple[str, Path]] = [("world", world_path)]
    for model, directory_name in ENTITY_DIRECTORIES.items():
        entity_type = get_entity_type(model)
        if entity_type is None:
            continue
        candidates.extend(
            (entity_type, path)
            for path in sorted((world_directory / directory_name).glob("*.yaml"))
        )

    sources: dict[tuple[str, str], dict[str, str]] = {}
    for entity_type, path in candidates:
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except (OSError, yaml.YAMLError):
            continue
        if isinstance(data, dict) and isinstance(data.get("id"), str):
            sources[(entity_type, data["id"])] = {
                "file_name": path.name,
                "source_path": _relative_path(path, world_directory),
            }
    return sources
