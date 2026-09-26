from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException
from worldbuilder.relationships import get_related_entities
from worldbuilder.loaders.world_loader import load_world_registry
from pydantic import ValidationError
from worldbuilder.config.entity_types import (
    get_entity_model,
    get_entity_type,
)
from worldbuilder.config.entity_types import get_entity_model
from worldbuilder.services.id_generator import generate_entity_id
from worldbuilder.services.world_service import WorldService

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
        "locations": [
            location.model_dump(mode="json") for location in registry.locations.values()
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
        registry.locations,
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


@app.put("/entities/{entity_id}")
def update_entity(
    entity_id: str,
    payload: dict,
) -> dict:
    registry = load_world_registry(WORLD_PATH)

    existing_entity = registry.get_entity(entity_id)

    if existing_entity is None:
        raise HTTPException(
            status_code=404,
            detail=f"Entity not found: {entity_id}",
        )

    model = get_entity_model(registry.get_entity_type(entity_id) or "")
    
    if model is None:
        raise HTTPException(
            status_code=500,
            detail=f"No model configuration found for entity: {entity_id}",
        )

    payload["id"] = entity_id

    try:
        updated_entity = model.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=exc.errors(),
        ) from exc

    service = WorldService(WORLD_PATH.parent)
    path = service.update_entity(updated_entity)

    return {
        "id": updated_entity.id,
        "entity_type": registry.get_entity_type(entity_id),
        "entity": updated_entity.model_dump(mode="json"),
        "path": str(path),
    }


@app.post("/entities")
def create_entity(payload: dict) -> dict:
    entity_type = payload.get("entity_type")
    entity_data = payload.get("entity")

    if not isinstance(entity_type, str):
        raise HTTPException(
            status_code=422,
            detail="entity_type is required.",
        )

    if not isinstance(entity_data, dict):
        raise HTTPException(
            status_code=422,
            detail="entity must be an object.",
        )

    registry = load_world_registry(WORLD_PATH)

    model = get_entity_model(entity_type)

    if model is None:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown entity type: {entity_type}",
        )

    name = entity_data.get("name")

    if not isinstance(name, str) or not name.strip():
        raise HTTPException(
            status_code=422,
            detail="entity.name is required.",
        )

    entity_id = generate_entity_id(
        name=name,
        model=model,
        registry=registry,
    )

    entity_data["id"] = entity_id

    try:
        entity = model.model_validate(entity_data)
    except ValidationError as exc:
        raise HTTPException(
            status_code=422,
            detail=exc.errors(),
        ) from exc

    service = WorldService(WORLD_PATH.parent)
    path = service.save_entity(entity)

    return {
        "id": entity.id,
        "entity_type": entity_type,
        "entity": entity.model_dump(mode="json"),
        "path": str(path),
    }


@app.delete("/entities/{entity_id}")
def delete_entity(entity_id: str) -> dict[str, str]:
    registry = load_world_registry(WORLD_PATH)

    entity = registry.get_entity(entity_id)

    if entity is None:
        raise HTTPException(
            status_code=404,
            detail=f"Entity not found: {entity_id}",
        )

    entity_type = registry.get_entity_type(entity_id)

    model = get_entity_model(registry.get_entity_type(entity_id) or "")

    if model is None:
        raise HTTPException(
            status_code=500,
            detail=f"No model configuration found for entity: {entity_id}",
        )

    service = WorldService(WORLD_PATH.parent)
    service.delete_entity(entity_id, model)

    return {
        "id": entity_id,
        "entity_type": entity_type or "",
        "status": "deleted",
    }


@app.get("/entities/{entity_id}/maps")
def get_entity_maps(entity_id: str) -> list[dict[str, str]]:
    registry = load_world_registry(WORLD_PATH)

    if registry.get_entity(entity_id) is None:
        raise HTTPException(
            status_code=404,
            detail=f"Entity not found: {entity_id}",
        )

    maps = []

    for world_map in registry.maps.values():
        for marker in world_map.markers:
            if marker.entity_id == entity_id:
                maps.append(
                    {
                        "id": world_map.id,
                        "name": world_map.name,
                    }
                )
                break

    return maps
