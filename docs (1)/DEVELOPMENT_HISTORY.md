# Development History and Lessons

## Map work

The map editor was actively developed before Story Planner work.

### Marker drag/sidebar bug

Problem: dragging a marker using the Geoman drag layer caused the sidebar to open on mouse release.

Cause: Geoman was intercepting normal Leaflet marker interaction.

Successful fix: add `pmIgnore` to normal campaign markers.

### Geoman finish-button issue

Problem: the Geoman finish control sometimes had to be clicked twice.

Hypothesis: controls were being destroyed/recreated as marker state changed.

Proposed direction: separate one-time map/control initialization from data-dependent shape event registration.

Status: proposed; verify current code.

## Persistence/YAML problem

A map update caused a YAML scanner error in:

`worlds/elligaesia/maps/elligaesia.yaml`

with `could not find expected ':'` around lines 181-182.

Another traceback showed:

`world_service.py` calling `data.get(...)` on `None`.

This is a reminder to validate serialized entity data and YAML before debugging higher-level behavior.

## Story model regression

During initial Story Planner implementation, `worldbuilder/models/story.py` was accidentally replaced with only new Story Planner models.

That removed:

- `StoryText`
- `StoryEntityLink`
- `StoryContent`

and caused widespread pytest collection errors because `campaign.py` and tests import those classes.

The correct direction is to preserve the original story-content models and add the Story Planner models alongside them.

## Current priority shift

The developer explicitly paused map work and moved focus to:

1. Campaign Dashboard
2. Story Planner

The Story Planner is the deeper architectural feature; the Dashboard should be the DM-facing operational surface over it.

## General lesson

The project is growing from a simple world database into a campaign operating system. Changes should be incremental and tested because many parts reference shared entity models.
