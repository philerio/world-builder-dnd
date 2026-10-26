from typing import Literal

from pydantic import Field

from .base import WorldObject
from .political_structure import PoliticalOffice


class Kingdom(WorldObject):
    """A kingdom or nation in the political hierarchy."""

    political_level: Literal["kingdom", "nation"] = "kingdom"
    parent_kingdom: str | None = None
    ruler: str | None = None
    capital: str | None = None
    continent: str | None = None
    government_type: str | None = None
    government_notes: str | None = None
    leadership: list[PoliticalOffice] = Field(default_factory=list)
