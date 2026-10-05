from pydantic import Field

from .base import WorldObject


class Lore(WorldObject):
    """A piece of world lore, history, or setting information."""

    player_knowledge: str | None = None
    details: str | None = None
    dm_notes: str | None = None
    campaigns: list[str] = Field(default_factory=list)
