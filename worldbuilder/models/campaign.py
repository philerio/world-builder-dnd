from pydantic import Field

from worldbuilder.models.base import WorldObject


class Campaign(WorldObject):
    """A campaign or major story arc in the world."""

    overview: str | None = None
    status: str | None = None
    locations: list[str] = Field(default_factory=list)
    npcs: list[str] = Field(default_factory=list)
    player_characters: list[str] = Field(default_factory=list)
    outcome: str | None = None
    consequences: str | None = None
