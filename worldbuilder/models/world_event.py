from pydantic import Field

from .base import WorldObject


class WorldEvent(WorldObject):
    """An event, crisis, development, or unresolved situation in the world."""

    type: str | None = None
    status: str | None = None
    locations: list[str] = Field(default_factory=list)
    campaigns: list[str] = Field(default_factory=list)
    caused_by: list[str] = Field(default_factory=list)
    true_causes: list[str] = Field(default_factory=list)
    hidden_connections: list[str] = Field(default_factory=list)
    dm_notes: str | None = None
    consequences: list[str] = Field(default_factory=list)
    potential_campaign: bool = False
    true_causes: list[str] = Field(default_factory=list)
    hidden_connections: list[str] = Field(default_factory=list)
    dm_notes: str | None = None
