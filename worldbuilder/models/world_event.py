from pydantic import BaseModel, Field

from .base import WorldObject
from .story import WorldStoryThreadLink


class CampaignStorySource(BaseModel):
    """The campaign story records that led to a world event."""

    campaign_id: str
    plot_point_id: str | None = None
    plot_point_name: str | None = None
    consequence_ids: list[str] = Field(default_factory=list)
    consequence_descriptions: list[str] = Field(default_factory=list)
    player_action_ids: list[str] = Field(default_factory=list)
    player_action_descriptions: list[str] = Field(default_factory=list)


class WorldEvent(WorldObject):
    """An event, crisis, development, or unresolved situation in the world."""

    type: str | None = None
    status: str | None = None
    locations: list[str] = Field(default_factory=list)
    characters: list[str] = Field(default_factory=list)
    campaigns: list[str] = Field(default_factory=list)
    world_stories: list[str] = Field(default_factory=list)
    world_story_threads: list[WorldStoryThreadLink] = Field(default_factory=list)
    story_sources: list[CampaignStorySource] = Field(default_factory=list)
    timeline_event_id: str | None = None
    caused_by: list[str] = Field(default_factory=list)
    true_causes: list[str] = Field(default_factory=list)
    hidden_connections: list[str] = Field(default_factory=list)
    dm_notes: str | None = None
    consequences: list[str] = Field(default_factory=list)
    potential_campaign: bool = False
