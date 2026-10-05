from typing import Literal

from pydantic import BaseModel, Field

from .base import WorldObject
from .story import WorldClock, WorldStoryThreadLink


class WorldStoryContribution(BaseModel):
    """A campaign outcome or consequence that may affect a world story."""

    campaign_id: str
    source_type: Literal["campaign_outcome", "plot_point", "consequence", "player_action"] = "campaign_outcome"
    source_id: str | None = None
    summary: str
    connection_status: Literal["proposed", "confirmed", "rejected"] = "proposed"
    dm_notes: str | None = None
    thread_ids: list[str] = Field(default_factory=list)


class WorldStoryThread(BaseModel):
    """A flexible strand within a setting-wide story."""

    id: str
    name: str
    description: str | None = None
    status: str = "active"
    campaigns: list[str] = Field(default_factory=list)
    world_events: list[str] = Field(default_factory=list)


class WorldStory(WorldObject):
    """An overarching narrative that may span multiple campaigns."""

    overview: str | None = None
    status: str = "active"
    characters: list[str] = Field(default_factory=list)
    campaigns: list[str] = Field(default_factory=list)
    world_events: list[str] = Field(default_factory=list)
    world_clocks: list[WorldClock] = Field(default_factory=list)
    threads: list[WorldStoryThread] = Field(default_factory=list)
    contributions: list[WorldStoryContribution] = Field(default_factory=list)
