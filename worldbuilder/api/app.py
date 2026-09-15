from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from worldbuilder.relationships import get_related_entities
from worldbuilder.loaders.world_loader import load_world_registry

app = FastAPI(
    title="D&D World Builder API",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
WORLD_PATH = Path("worlds/elligaesia/world.yaml")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/world")
def get_world() -> dict:
    if not WORLD_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"World file not found: {WORLD_PATH}",
        )

    registry = load_world_registry(WORLD_PATH)

    return {
        "world": next(
            world.model_dump(mode="json") for world in registry.worlds.values()
        ),
        "continents": [
            continent.model_dump(mode="json")
            for continent in registry.continents.values()
        ],
        "kingdoms": [
            kingdom.model_dump(mode="json") for kingdom in registry.kingdoms.values()
        ],
        "regions": [
            region.model_dump(mode="json") for region in registry.regions.values()
        ],
        "cities": [city.model_dump(mode="json") for city in registry.cities.values()],
        "npcs": [npc.model_dump(mode="json") for npc in registry.npcs.values()],
        "player_characters": [
            character.model_dump(mode="json")
            for character in registry.player_characters.values()
        ],
        "campaigns": [
            campaign.model_dump(mode="json") for campaign in registry.campaigns.values()
        ],
        "world_events": [
            event.model_dump(mode="json") for event in registry.world_events.values()
        ],
        "timeline_events": [
            event.model_dump(mode="json") for event in registry.timeline_events.values()
        ],
        "lores": [lore.model_dump(mode="json") for lore in registry.lores.values()],
        "artifacts": [
            artifact.model_dump(mode="json") for artifact in registry.artifacts.values()
        ],
        "maps": [
            world_map.model_dump(mode="json") for world_map in registry.maps.values()
        ],
    }


@app.get("/entities/{entity_id}")
def get_entity(entity_id: str) -> dict:
    registry = load_world_registry(WORLD_PATH)

    entity = registry.get_entity(entity_id)

    if entity is None:
        raise HTTPException(
            status_code=404,
            detail=f"Entity not found: {entity_id}",
        )

    entity_type = registry.get_entity_type(entity_id)

    return {
        "id": entity_id,
        "entity_type": entity_type,
        "entity": entity.model_dump(mode="json"),
    }


@app.get("/entities")
def list_entities() -> list[dict[str, str]]:
    registry = load_world_registry(WORLD_PATH)

    entities: list[dict[str, str]] = []

    collections = [
        registry.worlds,
        registry.continents,
        registry.regions,
        registry.kingdoms,
        registry.cities,
        registry.npcs,
        registry.player_characters,
        registry.campaigns,
        registry.world_events,
        registry.timeline_events,
        registry.lores,
        registry.artifacts,
        registry.maps,
    ]

    for collection in collections:
        for entity_id, entity in collection.items():
            entities.append(
                {
                    "id": entity_id,
                    "entity_type": registry.get_entity_type(entity_id) or "",
                    "name": entity.name,
                }
            )

    return entities


@app.get("/entities/{entity_id}/related")
def get_related(entity_id: str) -> list[dict[str, str]]:
    registry = load_world_registry(WORLD_PATH)

    if registry.get_entity(entity_id) is None:
        raise HTTPException(
            status_code=404,
            detail=f"Entity not found: {entity_id}",
        )

    references = get_related_entities(registry, entity_id)

    return [
        {
            "id": reference.id,
            "entity_type": reference.entity_type,
            "name": registry.get_entity(reference.id).name,
        }
        for reference in references
    ]
