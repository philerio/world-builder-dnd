from pydantic import Field

from .base import WorldObject


class TimelineEvent(WorldObject):
    """A significant event in the history of the world."""

    era: str | None = None
    date: str | None = None
    locations: list[str] = Field(default_factory=list)
    kingdoms: list[str] = Field(default_factory=list)
    characters: list[str] = Field(default_factory=list)
    campaigns: list[str] = Field(default_factory=list)
    consequences: list[str] = Field(default_factory=list)
    dm_notes: str | None = None