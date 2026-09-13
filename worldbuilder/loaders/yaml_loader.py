from pathlib import Path

import yaml
from pydantic import BaseModel

from worldbuilder.models.world import World


def load_world(path: Path) -> World:
    """Load a world definition from a YAML file."""

    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file)

    return World.model_validate(data)


def save_yaml(model: BaseModel, path: Path) -> None:
    """Save a Pydantic model as a YAML file."""

    data = model.model_dump(mode="json", exclude_none=True)

    with path.open("w", encoding="utf-8") as file:
        yaml.safe_dump(
            data,
            file,
            sort_keys=False,
            default_flow_style=False,
        )