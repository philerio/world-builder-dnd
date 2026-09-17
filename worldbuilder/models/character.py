from pydantic import Field

from worldbuilder.models.character_event import CharacterEvent
from worldbuilder.models.character_relationship import CharacterRelationship
from .base import WorldObject


class Character(WorldObject):
    role: str | None = None
    city: str | None = None
    region: str | None = None
    kingdom: str | None = None
    details: str | None = None
    motives: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    fears: list[str] = Field(default_factory=list)
    secrets: list[str] = Field(default_factory=list)
    knowledge: list[str] = Field(default_factory=list)
    events: list[str | CharacterEvent] = Field(default_factory=list)
    relationships: list[CharacterRelationship] = Field(default_factory=list)
