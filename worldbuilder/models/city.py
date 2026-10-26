from pydantic import Field

from .base import WorldObject
from .political_structure import PoliticalOffice


class City(WorldObject):
    """A city or settlement within the world."""

    kingdom: str | None = None
    region: str | None = None
    population: int | None = None
    details: str | None = None
    dm_notes: str | None = None
    government_type: str | None = None
    government_notes: str | None = None
    leadership: list[PoliticalOffice] = Field(default_factory=list)
