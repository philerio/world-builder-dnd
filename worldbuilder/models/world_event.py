from pydantic import Field

from .base import WorldObject


class WorldEvent(WorldObject):
    """An event, crisis, development, or unresolved situation in the world."""

    type: str | None = None
    status: str | None = None
    locations: list[str] = Field(default_factory=list)
    campaigns: list[str] = Field(default_factory=list)
    caused_by: list[str] = Field(default_factory=list)
    consequences: list[str] = Field(default_factory=list)
    potential_campaign: bool = False
