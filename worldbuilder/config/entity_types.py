import re
from pydantic import BaseModel

from worldbuilder.config.entity_directories import ENTITY_DIRECTORIES


def _model_to_entity_type(model: type[BaseModel]) -> str:
    """Convert a model class name into an API entity type."""
    name = model.__name__

    if name.isupper():
        return name.lower()

    name = re.sub(
        r"(?<!^)(?=[A-Z])",
        "_",
        name,
    )

    return name.lower()


ENTITY_TYPES: dict[str, type[BaseModel]] = {
    _model_to_entity_type(model): model for model in ENTITY_DIRECTORIES
}


def get_entity_model(entity_type: str) -> type[BaseModel] | None:
    """Return the model for an API entity type."""
    return ENTITY_TYPES.get(entity_type.lower())


def get_entity_type(model: type[BaseModel]) -> str | None:
    """Return the API entity type for a model."""
    return next(
        (
            entity_type
            for entity_type, entity_model in ENTITY_TYPES.items()
            if entity_model is model
        ),
        None,
    )
