from pathlib import Path

import yaml

from worldbuilder.models.world import World


def load_world(path: Path) -> World:
    """Load a world definition from a YAML file."""

    with path.open("r", encoding="utf-8") as file:
        data = yaml.safe_load(file)

    return World.model_validate(data)