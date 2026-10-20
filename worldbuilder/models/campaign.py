from pydantic import BaseModel, Field

from worldbuilder.models.base import WorldObject
from worldbuilder.models.story import CampaignStory, StoryContent


class CampaignArcSection(BaseModel):
    id: str
    title: str
    content: str


class Campaign(WorldObject):
    """A campaign or major story arc in the world."""

    overview: str | None = None
    overarching_plot: str | None = None
    overarching_plot_sections: list[CampaignArcSection] = Field(default_factory=list)
    world_stories: list[str] = Field(default_factory=list)
    status: str | None = None
    locations: list[str] = Field(default_factory=list)
    npcs: list[str] = Field(default_factory=list)
    player_characters: list[str] = Field(default_factory=list)
    outcome: str | None = None
    consequences: str | None = None
    story: StoryContent | CampaignStory | None = None
