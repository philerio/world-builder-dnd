from typing import Literal

from pydantic import BaseModel, Field


class StoryText(BaseModel):
    """A piece of ordinary story text."""

    type: Literal["text"] = "text"
    text: str


class StoryEntityLink(BaseModel):
    """A clickable reference to a world entity."""

    type: Literal["entity_link"] = "entity_link"
    text: str
    entity_id: str


StoryNode = StoryText | StoryEntityLink


class StoryContent(BaseModel):
    """Structured story content made of story text and entity links."""

    nodes: list[StoryNode]


class WorldStoryThreadLink(BaseModel):
    """A link to a thread within a particular World Story."""

    world_story_id: str
    thread_id: str


StoryBeatStatus = Literal[
    "planned",
    "available",
    "in_progress",
    "completed",
    "failed",
    "skipped",
    "changed",
]

ConsequenceStatus = Literal[
    "pending",
    "active",
    "resolved",
    "prevented",
]

ClockStatus = Literal[
    "active",
    "paused",
    "completed",
]


class StoryConsequence(BaseModel):
    id: str
    description: str

    trigger: str | None = None
    player_action: str | None = None
    timing: str | None = None

    status: ConsequenceStatus = "pending"

    leads_to: list[str] = Field(default_factory=list)
    world_stories: list[str] = Field(default_factory=list)
    world_story_threads: list[WorldStoryThreadLink] = Field(default_factory=list)


class StoryBeatCheck(BaseModel):
    """A DM-facing notice, approach, or obstacle with its check and outcomes."""

    id: str
    name: str
    category: Literal["notice", "approach", "obstacle"] = "notice"
    description: str | None = None
    roll_type: Literal["skill_check", "ability_check", "saving_throw", "passive", "contested"] = "skill_check"
    ability: Literal["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] | None = None
    skill: str | None = None
    dc: int | None = Field(default=None, ge=1, le=40)
    success: str | None = None
    failure: str | None = None


class StoryBeat(BaseModel):
    id: str
    name: str

    description: str | None = None

    # Optional rich version of description with inline entity links.
    description_content: StoryContent | None = None

    events_content: StoryContent | None = None
    triggers_content: StoryContent | None = None
    possible_approaches_content: StoryContent | None = None

    status: StoryBeatStatus = "planned"

    act: str | None = None
    order: int | None = None

    triggers: list[str] = Field(default_factory=list)

    events: str | None = None

    secrets: list[str] = Field(default_factory=list)

    possible_approaches: list[str] = Field(default_factory=list)

    # Optional structured checks and outcomes for notices, approaches, or obstacles.
    checks: list[StoryBeatCheck] = Field(default_factory=list)

    leads_to: list[str] = Field(default_factory=list)

    locations: list[str] = Field(default_factory=list)
    npcs: list[str] = Field(default_factory=list)
    player_characters: list[str] = Field(default_factory=list)

    consequences: list[StoryConsequence] = Field(default_factory=list)

    world_events: list[str] = Field(default_factory=list)
    world_stories: list[str] = Field(default_factory=list)
    world_story_threads: list[WorldStoryThreadLink] = Field(default_factory=list)


class PlayerAction(BaseModel):
    id: str
    description: str

    session: int | None = None

    story_beat: str | None = None

    consequence_ids: list[str] = Field(default_factory=list)

    # Larger setting stories this action may affect. These are proposals for DM review.
    world_stories: list[str] = Field(default_factory=list)
    world_story_threads: list[WorldStoryThreadLink] = Field(default_factory=list)

    reviewed: bool = False

    notes: str | None = None


class WorldClock(BaseModel):
    id: str
    name: str

    description: str | None = None

    current: int = 0
    maximum: int = 1

    stages: list[str] = Field(default_factory=list)

    completion: str | None = None

    status: ClockStatus = "active"


class SessionRecap(BaseModel):
    """Optional written recap for one campaign session."""

    session: int
    played_on: str | None = None
    summary: str | None = None
    notes: str | None = None
    timeline_event_id: str | None = None


class SessionPrep(BaseModel):
    """A flexible, editable preparation sheet for one campaign session."""

    session: int
    agenda: str | None = None
    dm_notes: str | None = None
    plot_point_ids: list[str] = Field(default_factory=list)
    reference_ids: list[str] = Field(default_factory=list)


class CampaignStory(BaseModel):
    beats: list[StoryBeat] = Field(default_factory=list)

    current_beat: str | None = None

    player_actions: list[PlayerAction] = Field(default_factory=list)

    session_recaps: list[SessionRecap] = Field(default_factory=list)

    session_preps: list[SessionPrep] = Field(default_factory=list)

    world_clocks: list[WorldClock] = Field(default_factory=list)
