from typing import Literal

from pydantic import Field

from worldbuilder.models.base import WorldObject


class Artifact(WorldObject):
    """A story item, book, artifact, or other significant object."""

    item_type: Literal["artifact", "book", "journal", "letter", "map", "relic", "key", "other"] = "artifact"
    details: str | None = None
    dm_notes: str | None = None
    player_text: str | None = None
    campaigns: list[str] = Field(default_factory=list)
    world_stories: list[str] = Field(default_factory=list)
