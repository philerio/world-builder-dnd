from pathlib import Path
from typing import TypeVar

import yaml
from pydantic import BaseModel

ModelT = TypeVar("ModelT", bound=BaseModel)


def load_yaml_directory(
    directory: Path,
    model: type[ModelT],
) -> list[ModelT]:
    """Load all YAML files in a directory into Pydantic models."""
    if not directory.exists():
        return []

    entities: list[ModelT] = []

    for path in sorted(directory.glob("*.yaml")):
        with path.open("r", encoding="utf-8") as file:
            data = yaml.safe_load(file)

        entities.append(model.model_validate(data))

    return entities


def save_yaml_entity(
    entity: ModelT,
    directory: Path,
) -> Path:
    """Save a Pydantic entity to a YAML file based on its ID."""
    directory.mkdir(parents=True, exist_ok=True)

    path = directory / f"{entity.id}.yaml"

    data = entity.model_dump(mode="json", exclude_none=True)

    with path.open("w", encoding="utf-8") as file:
        yaml.safe_dump(
            data,
            file,
            sort_keys=False,
            default_flow_style=False,
        )

    return path