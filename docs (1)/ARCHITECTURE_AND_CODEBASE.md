# Architecture and Codebase Notes

## Backend architecture

The backend is Python and uses Pydantic models. The application loads structured world entities from YAML directories and maintains them through a central registry.

A recent traceback showed this flow:

`worldbuilder/api/app.py` -> `load_world_registry()` -> `load_yaml_directory()` -> Pydantic entity loading

The update path eventually reaches `worldbuilder/services/world_service.py`.

### World registry

`WorldRegistry` contains entity collections and provides globally addressable entities. Entity IDs are used by references throughout the application.

Do not assume every entity is embedded. The intended pattern is that entities can reference other entities by ID and the frontend can resolve them through world-data services.

### Entity loading

The loader discovers YAML directories and loads typed Pydantic models. YAML validity is therefore critical.

A historical map save failure produced a YAML scanner error in:

`worlds/elligaesia/maps/elligaesia.yaml`

around lines 181-182 with `could not find expected ':'`.

A related service failure occurred when a loaded YAML record was `None` and `world_service.py` called `data.get(...)`. This indicates malformed YAML can cascade into service-level failures. When debugging persistence, inspect the actual YAML before assuming the frontend is at fault.

## Campaign model

Current campaign code has the general campaign fields plus Story Planner support:

```python
class Campaign(WorldObject):
    overview: str | None = None
    status: str | None = None
    locations: list[str] = Field(default_factory=list)
    npcs: list[str] = Field(default_factory=list)
    player_characters: list[str] = Field(default_factory=list)
    outcome: str | None = None
    consequences: str | None = None
    story: CampaignStory | None = None
```

The exact current file should always be inspected before editing.

## Existing StoryContent compatibility requirement

The original story model was:

```python
from typing import Literal
from pydantic import BaseModel

class StoryText(BaseModel):
    type: Literal["text"] = "text"
    text: str

class StoryEntityLink(BaseModel):
    type: Literal["entity_link"] = "entity_link"
    text: str
    entity_id: str

StoryNode = StoryText | StoryEntityLink

class StoryContent(BaseModel):
    nodes: list[StoryNode]
```

Do not remove this functionality.

## Tests

Relevant tests include:

- `tests/test_story.py`
- `tests/test_story_validation.py`
- campaign model tests
- registry tests
- loader tests
- world service tests
- validation tests
- city/NPC/detail/continent loader tests

A previous accidental replacement of `story.py` caused broad test collection failures because `StoryContent` could no longer be imported. The lesson is to preserve public model names used by existing tests.

## Frontend data flow

The frontend uses a world-data context. Parent pages pass callbacks into visual components; updates ultimately call `updateEntity()` and persist the updated entity to the backend.

For maps, the parent had handlers equivalent to:

```tsx
const handleShapeEdited = async (marker: MapMarker) => {
  if (!selectedMap) return;

  const updatedMarkers = selectedMap.markers.map((currentMarker) =>
    currentMarker.id === marker.id ? marker : currentMarker,
  );

  await updateEntity(selectedMap.id, {
    ...selectedMap,
    markers: updatedMarkers,
  });
};
```

and a corresponding `handleMarkerMove`.

## Map architecture

`MapsPage.tsx` contains types/components for:

- `MapViewer`
- Leaflet map integration
- campaign markers
- context menus
- Geoman controller
- marker move callbacks
- shape creation/edit callbacks

Normal markers and Geoman shapes must be treated as separate interaction mechanisms.

### Known fix

Normal campaign markers needed:

```tsx
pmIgnore
```

on the Leaflet `Marker` so Geoman would not intercept marker dragging.

### Known unfinished issue

Geoman edit/drag completion sometimes required two clicks. The suspected cause was a lifecycle effect that re-created controls when marker data changed. A clean implementation should initialize Geoman controls once per map instance and manage data-dependent handlers separately.

Do not assume this issue is still present; inspect current code.

## Frontend philosophy

Prefer clear, DM-friendly interfaces over technically dense configuration screens. MUI is already in use; maintain visual consistency with the existing app.
