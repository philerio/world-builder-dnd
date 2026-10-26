# World Builder D&D

World Builder D&D is an open-source tool for managing tabletop RPG campaign settings.

The project is designed around the philosophy that your world data should exist in one place and be reusable across multiple outputs.

Current planned outputs include:

- Notion
- PDF Campaign Guide
- Static Website
- Player Guide
- Interactive Maps

The world data is stored as YAML files and synchronized through the application.

## World data location

By default, the backend reads and writes `worlds/elligaesia` relative to the
project directory. You can set `WORLD_DATA_DIR` in `.env` to choose another
default, or use **Data Health → World data folder** to enable a server-side
override from the UI. The override folder must contain `world.yaml` and the
entity folders. For example, if a network drive is mounted at `/mnt/worldbuilder`,
set:

```env
WORLD_DATA_DIR=/mnt/worldbuilder/elligaesia
```

The backend also stores map assets and YAML edit backups alongside `world.yaml`.
Saving a new location does not move data; restart the backend to apply it. Keep
one backend instance writing to this folder at a time, and ensure the mounted
drive is available before starting the backend.

## Goals

- Store all world data as structured files.
- Validate references and relationships.
- Automatically build a Notion workspace.
- Generate documentation.
- Export campaign settings.

## Project Status

🚧 In Development

Current Version: v0.1.0
