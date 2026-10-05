from pydantic import Field

from .base import WorldObject
from .story import WorldStoryThreadLink


class TimelineEvent(WorldObject):
    """A significant event in the history of the world."""

    era: str | None = None
    date: str | None = None
    locations: list[str] = Field(default_factory=list)
    kingdoms: list[str] = Field(default_factory=list)
    characters: list[str] = Field(default_factory=list)
    campaigns: list[str] = Field(default_factory=list)
    world_stories: list[str] = Field(default_factory=list)
    world_story_threads: list[WorldStoryThreadLink] = Field(default_factory=list)
    source_world_event_id: str | None = None
    consequences: list[str] = Field(default_factory=list)
    dm_notes: str | None = None
