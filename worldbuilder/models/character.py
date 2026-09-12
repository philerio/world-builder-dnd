from pydantic import Field

from worldbuilder.models.character_event import CharacterEvent

from .base import WorldObject


class Character(WorldObject):
    """Base character in the world."""

    role: str | None = None
    city: str | None = None
    region: str | None = None
    kingdom: str | None = None
    events: list[str | CharacterEvent] = Field(default_factory=list)
    details: str | None = None