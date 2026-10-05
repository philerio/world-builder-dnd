# Story Planner Design

## Why this feature exists

The developer currently creates campaigns by writing Word documents and dumping ideas onto the page. That is excellent for creative planning but weak at handling player agency.

The Story Planner should turn that creative material into a **living story structure** that can evolve during play.

## Core concepts

### Campaign Dashboard

The Campaign Dashboard is the DM's operational front door.

During a session it should make the most relevant information visible without requiring the DM to navigate the entire world database.

Potential dashboard sections:

- current story beat
- available/nearby beats
- recent player actions
- unresolved consequences
- active world clocks
- relevant NPCs
- relevant locations
- campaign notes
- recent timeline events

### Story Planner

The Story Planner is the underlying graph/flowchart.

It should show relationships such as:

```text
THE UNFORGIVEN
│
├── ACT 1: The Disappearances
│   ├── Investigate Reqrun
│   │   ├── Talk to farmers
│   │   ├── Investigate Frank
│   │   ├── Talk to Shana
│   │   └── Investigate Pattrice
│   └── Follow northern clues
│
├── ACT 2: The Northern Lake
│   ├── Travel north
│   ├── Forest encounter
│   │   ├── Stay on path
│   │   └── Leave path → Green Hag
│   ├── Discover corrupted lake
│   └── Discover hidden entrance
│
└── ACT 3: The Aboleth / Sorcerer
```

This is an example, not a mandatory exact graph.

## Story Beat

A beat should be useful at every level of completion.

A DM might create only:

- name

and later add:

- description
- status
- act/chapter
- order
- triggers
- what happens
- secrets
- possible approaches
- entities involved
- consequences
- leads to
- world events/clocks

### Proposed status values

- planned
- available
- in_progress
- completed
- failed
- skipped
- changed

A status of `changed` is useful because a beat may still have occurred but not in the originally imagined form.

## Player Actions

A Player Action records what the party actually did.

Examples:

- accused Frank
- ignored the northern road
- accepted the Green Hag's challenge
- returned to Reqrun instead of pursuing the lake

Player Actions should become campaign history, not just temporary UI state.

## Consequences

A consequence represents what an action causes or may cause.

A consequence may be:

- pending
- active
- resolved
- prevented

Examples:

```text
Player action:
The party ignores the northern trail.

Consequence:
The Abeloth continues taking animals.

Timing:
Another night passes.

Result:
The town-attack clock advances.
```

## World Clocks

A World Clock represents something that progresses independently of direct player action.

The canonical example from The Unforgiven is the escalating Abeloth threat:

```text
Night 1 → Night 2 → Night 3 → Town Attack
```

The campaign notes say the Abeloth will begin using animals to attack the town by the third night.

The UI should make clocks understandable at a glance and allow the DM to advance them manually when appropriate.

## Important design decision: flexibility

Do not make the Story Planner a rigid quest system.

The DM should be able to:

- add a beat spontaneously
- connect a new beat to an old one
- skip a beat
- mark a beat changed
- record an unexpected player action
- create a consequence that was not planned beforehand
- advance a world clock without completing a beat
- change future story direction

## Potential data model proposed during development

```python
StoryBeatStatus = Literal[
    "planned", "available", "in_progress", "completed",
    "failed", "skipped", "changed",
]

ConsequenceStatus = Literal[
    "pending", "active", "resolved", "prevented",
]

ClockStatus = Literal[
    "active", "paused", "completed",
]

class StoryConsequence(BaseModel):
    id: str
    description: str
    trigger: str | None = None
    player_action: str | None = None
    timing: str | None = None
    status: ConsequenceStatus = "pending"
    leads_to: list[str] = Field(default_factory=list)

class StoryBeat(BaseModel):
    id: str
    name: str
    description: str | None = None
    status: StoryBeatStatus = "planned"
    act: str | None = None
    order: int | None = None
    triggers: list[str] = Field(default_factory=list)
    events: str | None = None
    secrets: list[str] = Field(default_factory=list)
    possible_approaches: list[str] = Field(default_factory=list)
    leads_to: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    npcs: list[str] = Field(default_factory=list)
    player_characters: list[str] = Field(default_factory=list)
    consequences: list[StoryConsequence] = Field(default_factory=list)
    world_events: list[str] = Field(default_factory=list)

class PlayerAction(BaseModel):
    id: str
    description: str
    session: int | None = None
    story_beat: str | None = None
    consequence_ids: list[str] = Field(default_factory=list)
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

class CampaignStory(BaseModel):
    beats: list[StoryBeat] = Field(default_factory=list)
    current_beat: str | None = None
    player_actions: list[PlayerAction] = Field(default_factory=list)
    world_clocks: list[WorldClock] = Field(default_factory=list)
```

Treat this as a design proposal. Before changing it, inspect tests and current implementation.

## Future refinement already identified

Player Actions and Consequences may eventually deserve first-class campaign records rather than being nested only inside a beat. This would make chains survive changes to the current beat and make campaign history easier to query.

This has **not** been finalized. Do not implement it automatically without discussion/tests.
