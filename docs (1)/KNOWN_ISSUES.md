# Known Issues / Verification Queue

These are historical or suspected issues. Verify against the current repository before acting on them.

## High priority

### 1. Story model compatibility

Verify that `worldbuilder/models/story.py` contains the original:

- `StoryText`
- `StoryEntityLink`
- `StoryContent`

and that existing story tests pass.

### 2. Test baseline

Run the full test suite before continuing Story Planner development. The last recorded failure was an import regression caused by the story model replacement.

### 3. Map YAML validity

Verify that `worlds/elligaesia/maps/elligaesia.yaml` currently parses cleanly.

## Medium priority

### 4. Geoman lifecycle

Verify whether the finish-button/two-click issue still exists. If it does, inspect React effects before changing behavior.

### 5. Story Planner persistence

Verify whether the current Campaign model and YAML serialization can safely persist the proposed `CampaignStory` structure.

### 6. Story validation

Existing tests validate entity links against the world registry. New Story Planner references should follow the project's existing ID/reference validation philosophy rather than inventing a separate mechanism.

## Design questions not yet finalized

- Should Player Actions be first-class entities?
- Should Consequences be first-class entities?
- Should story graph edges be stored explicitly or inferred from beat `leads_to` arrays?
- Should acts be strings, entities, or a separate model?
- How much of the graph should be visible during a session versus during preparation?
- How should DM-only secrets be enforced in the UI/API?
