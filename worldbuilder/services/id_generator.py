import re
from typing import Type

from pydantic import BaseModel

from worldbuilder.registry import WorldRegistry


def _slugify(value: str) -> str:
    """Convert a name into a filesystem- and URL-friendly slug."""
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def _entity_type_slug(model: Type[BaseModel]) -> str:
    """Convert a model class name into an ID-friendly type name."""
    name = model.__name__

    if name.isupper():
        return name.lower()

    name = re.sub(
        r"(?<!^)(?=[A-Z])",
        "-",
        name,
    )

    return name.lower()


def generate_entity_id(
    name: str,
    model: Type[BaseModel],
    registry: WorldRegistry,
) -> str:
    """Generate a globally unique, human-readable entity ID."""
    name_slug = _slugify(name)
    type_slug = _entity_type_slug(model)

    base_id = f"{name_slug}-{type_slug}"
    entity_id = base_id
    counter = 2

    while registry.get_entity(entity_id) is not None:
        entity_id = f"{base_id}-{counter}"
        counter += 1

    return entity_id
