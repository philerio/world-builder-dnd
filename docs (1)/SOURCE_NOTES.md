# Source and Provenance Notes

This handoff was assembled from the project history available to the assistant, including project files and campaign documents.

## Structured world export

A Library markdown export (`Pasted markdown.md`) contains structured JSON-like world data with records for Elligaesia, its entities, campaigns, world events, timeline events, lore, and artifacts.

This is the strongest source for current structured IDs and entity names.

## Original campaign document

`Unforgiven(1).docx` is the original 19-page campaign planning document for The Unforgiven. It contains scene/encounter notes, secrets, NPC information, clues, branching outcomes, and the Abeloth/Dronath storyline.

## Project code snippets

The handoff was also informed by current project snippets including:

- `campaign.py`
- `MapsPage.tsx`
- `test_story.py`
- pytest output showing the StoryContent regression
- map/YAML error logs

## Conversation-derived design decisions

The handoff also captures explicit development decisions made during the project conversation, especially:

- Story Planner should be a living graph rather than a rigid quest tree.
- Campaign Dashboard should be the DM's operational front door.
- Player Actions and Consequences should capture emergent play.
- World Clocks should advance independently of player choices.
- Existing StoryContent models must be preserved.
- Map work is paused while Story Planner/Dashboard is developed.

## Important distinction

This package intentionally contains both **campaign canon** and **software design decisions**. Codex should not treat assistant-generated proposals as fictional canon or as immutable architecture unless they are explicitly accepted by the developer or already present in repository code/tests.
