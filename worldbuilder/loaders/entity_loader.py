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