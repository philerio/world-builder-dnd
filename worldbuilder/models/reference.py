from typing import Any

from pydantic import BaseModel


class EntityReference(BaseModel):
    """A reference to another entity in the world."""

    id: str
    entity_type: str


class ResolvedEntity(BaseModel):
    """An entity reference together with the resolved entity."""

    id: str
    entity_type: str
    entity: Any