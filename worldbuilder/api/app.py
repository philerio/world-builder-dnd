import json
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import ValidationError

from worldbuilder.config.entity_types import get_entity_model
from worldbuilder.loaders.world_loader import load_world_registry
from worldbuilder.models.reference import EntityReference
from worldbuilder.models.world import World
from worldbuilder.relationships import (
    get_campaign_related_entities,
    get_entity_relationships,
    get_related_entities,
)
from worldbuilder.services.data_health_service import (
    index_yaml_sources,
    scan_yaml_sources,
)
from worldbuilder.services.id_generator import generate_entity_id
from worldbuilder.services.world_service import WorldService
from worldbuilder.validation.validator import validate_registry

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
MAP_ASSETS_PATH = WORLD_PATH.parent / "map_assets"
MAX_MAP_ASSET_BYTES = 5 * 1024 * 1024
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def _read_map_asset_default_sizes() -> dict[str, int]:
    try:
        stored_settings = json.loads((MAP_ASSETS_PATH / ".stamp-settings.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(stored_settings, dict):
        return {}
    return {
        filename: size
        for filename, size in stored_settings.items()
        if isinstance(filename, str) and type(size) is int and 24 <= size <= 256
    }


@app.get("/map-assets")
def list_map_assets() -> dict[str, list[dict[str, str | int]]]:
    MAP_ASSETS_PATH.mkdir(parents=True, exist_ok=True)
    default_sizes = _read_map_asset_default_sizes()
    assets = [
        {
            "name": path.stem.rsplit("_", maxsplit=1)[0].replace("_", " "),
            "image_path": f"/map-assets/{path.name}",
            "default_size": default_sizes.get(path.name, 72),
        }
        for path in sorted(MAP_ASSETS_PATH.glob("*.png"), key=lambda item: item.name.lower())
        if path.is_file()
    ]
    return {"assets": assets}


@app.put("/map-assets/{filename}/settings")
def update_map_asset_settings(filename: str, payload: dict) -> dict[str, str | int]:
    if Path(filename).name != filename or not filename.endswith(".png"):
        raise HTTPException(status_code=404, detail="Map image not found.")
    if not (MAP_ASSETS_PATH / filename).is_file():
        raise HTTPException(status_code=404, detail="Map image not found.")

    default_size = payload.get("default_size")
    if type(default_size) is not int or not 24 <= default_size <= 256:
        raise HTTPException(status_code=422, detail="Default stamp size must be a whole number from 24 to 256.")

    MAP_ASSETS_PATH.mkdir(parents=True, exist_ok=True)
    settings = _read_map_asset_default_sizes()
    settings[filename] = default_size
    (MAP_ASSETS_PATH / ".stamp-settings.json").write_text(json.dumps(settings, indent=2) + "\n", encoding="utf-8")
    return {"image_path": f"/map-assets/{filename}", "default_size": default_size}


@app.post("/map-assets")
async def upload_map_asset(request: Request, name: str = "Building") -> dict[str, str | int]:
    content_type = request.headers.get("content-type", "").split(";", maxsplit=1)[0].strip().lower()
    if content_type != "image/png":
        raise HTTPException(status_code=415, detail="Only PNG building images are supported.")

    image_bytes = await request.body()
    if len(image_bytes) > MAX_MAP_ASSET_BYTES:
        raise HTTPException(status_code=413, detail="PNG files must be 5 MB or smaller.")
    if len(image_bytes) <= len(PNG_SIGNATURE) or not image_bytes.startswith(PNG_SIGNATURE):
        raise HTTPException(status_code=415, detail="The uploaded file is not a valid PNG image.")

    safe_name = "".join(character.lower() if character.isalnum() else "_" for character in Path(name).stem)
    safe_name = "_".join(part for part in safe_name.split("_") if part)[:48] or "building"
    filename = f"{safe_name}_{uuid4().hex[:12]}.png"
    MAP_ASSETS_PATH.mkdir(parents=True, exist_ok=True)
    (MAP_ASSETS_PATH / filename).write_bytes(image_bytes)
    return {"name": safe_name.replace("_", " "), "image_path": f"/map-assets/{filename}", "default_size": 72}


@app.get("/map-assets/{filename}")
def get_map_asset(filename: str) -> FileResponse:
    if Path(filename).name != filename or not filename.endswith(".png"):
        raise HTTPException(status_code=404, detail="Map image not found.")
    image_path = MAP_ASSETS_PATH / filename
    if not image_path.is_file():
        raise HTTPException(status_code=404, detail="Map image not found.")
    return FileResponse(image_path, media_type="image/png")


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/validation")
def validate_world_data() -> dict:
    """Report broken YAML files and references across the loaded world."""
    issues = scan_yaml_sources(WORLD_PATH)
    if not issues:
        try:
            registry = load_world_registry(WORLD_PATH)
            result = validate_registry(registry)
            source_index = index_yaml_sources(WORLD_PATH)
            for issue in result.issues:
                source = source_index.get((issue.get("source_type", ""), issue.get("source_id", "")))
                if source:
                    issue.update(source)
                issues.append(issue)
        except Exception as exc:
            issues.append({
                "message": f"Could not load the world registry: {exc}",
                "severity": "error",
                "source_type": "world",
                "file_name": "world.yaml",
                "source_path": "world.yaml",
            })

    errors = [issue["message"] for issue in issues if issue.get("severity") == "error"]
    warnings = [issue["message"] for issue in issues if issue.get("severity") == "warning"]
    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "issues": issues,
    }


@app.get("/data-health/yaml/{entity_type}/{file_name}")
def get_data_health_yaml(entity_type: str, file_name: str) -> dict[str, str]:
    """Read an allow-listed YAML source file, including files that fail to parse."""
    service = WorldService(WORLD_PATH.parent)
    try:
        content, path = service.read_yaml_source(entity_type, file_name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"content": content, "path": str(path.relative_to(WORLD_PATH.parent))}


@app.put("/data-health/yaml/{entity_type}/{file_name}")
def update_data_health_yaml(entity_type: str, file_name: str, payload: dict) -> dict[str, str]:
    """Validate and save an allow-listed YAML source file."""
    content = payload.get("content")
    if not isinstance(content, str):
        raise HTTPException(status_code=422, detail="content must be a string.")

    service = WorldService(WORLD_PATH.parent)
    try:
        path = service.update_yaml_source(entity_type, file_name, content)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"path": str(path.relative_to(WORLD_PATH.parent))}


@app.post("/data-health/yaml/{entity_type}/{file_name}/preview")
def preview_data_health_yaml(entity_type: str, file_name: str, payload: dict) -> dict[str, str | bool]:
    """Validate proposed YAML and return a diff without writing the file."""
    content = payload.get("content")
    if not isinstance(content, str):
        raise HTTPException(status_code=422, detail="content must be a string.")
    service = WorldService(WORLD_PATH.parent)
    try:
        return service.preview_yaml_source(entity_type, file_name, content)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/data-health/yaml/{entity_type}/{file_name}/replace-reference")
def prepare_data_health_reference_repair(entity_type: str, file_name: str, payload: dict) -> dict:
    """Prepare a safe, exact reference replacement and return its diff for review."""
    reference_type = payload.get("reference_type")
    reference_path = payload.get("reference_path")
    expected_id = payload.get("reference_id")
    replacement_id = payload.get("replacement_id")
    if (
        not isinstance(reference_type, str)
        or not isinstance(reference_path, list)
        or any(not isinstance(part, (str, int)) or isinstance(part, bool) for part in reference_path)
        or not isinstance(expected_id, str)
        or not isinstance(replacement_id, str)
    ):
        raise HTTPException(status_code=422, detail="A reference type, path, current ID, and replacement ID are required.")

    try:
        registry = load_world_registry(WORLD_PATH)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not load world entities for reference selection: {exc}") from exc
    collections = {
        "character": (registry.npcs, registry.player_characters),
        "location": (registry.cities, registry.locations, registry.regions, registry.kingdoms),
        "entity": (
            registry.continents, registry.kingdoms, registry.regions, registry.cities,
            registry.locations, registry.npcs, registry.player_characters, registry.campaigns,
            registry.world_events, registry.timeline_events, registry.lores,
            registry.artifacts, registry.maps, registry.world_stories,
        ),
    }
    if reference_type in collections:
        exists = any(replacement_id in collection for collection in collections[reference_type])
    else:
        collection = getattr(registry, {
            "continent": "continents",
            "kingdom": "kingdoms",
            "region": "regions",
            "city": "cities",
            "location": "locations",
            "npc": "npcs",
            "world_story": "world_stories",
            "world_event": "world_events",
            "timeline_event": "timeline_events",
            "player_character": "player_characters",
            "campaign": "campaigns",
            "lore": "lores",
            "artifact": "artifacts",
            "map": "maps",
        }.get(reference_type, ""), None)
        exists = isinstance(collection, dict) and replacement_id in collection
    if not exists:
        raise HTTPException(status_code=422, detail=f"The selected ID is not a valid {reference_type}.")

    service = WorldService(WORLD_PATH.parent)
    try:
        return service.prepare_reference_repair(
            entity_type,
            file_name,
            reference_path,
            expected_id,
            replacement_id,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/data-health/yaml/{entity_type}/{file_name}/backups")
def list_data_health_yaml_backups(entity_type: str, file_name: str) -> list[dict[str, str | int]]:
    """List saved YAML versions for a source file."""
    service = WorldService(WORLD_PATH.parent)
    try:
        return service.list_yaml_backups(entity_type, file_name)
    except (FileNotFoundError, ValueError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/data-health/yaml/{entity_type}/{file_name}/restore")
def restore_data_health_yaml_backup(
    entity_type: str,
    file_name: str,
    payload: dict,
) -> dict[str, str]:
    """Restore a saved YAML version, keeping the current content as another backup."""
    backup_id = payload.get("backup_id")
    if not isinstance(backup_id, str):
        raise HTTPException(status_code=422, detail="backup_id must be a string.")
    service = WorldService(WORLD_PATH.parent)
    try:
        path = service.restore_yaml_backup(entity_type, file_name, backup_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"path": str(path.relative_to(WORLD_PATH.parent))}


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
        "world_stories": [
            story.model_dump(mode="json")
            for story in registry.world_stories.values()
        ],
        "dm_scratchpad_entries": [
            entry.model_dump(mode="json")
            for entry in registry.dm_scratchpad_entries.values()
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
        registry.world_stories,
        registry.dm_scratchpad_entries,
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


@app.get("/campaigns/{campaign_id}/references")
def get_campaign_references(campaign_id: str) -> list[dict[str, str]]:
    registry = load_world_registry(WORLD_PATH)
    if campaign_id not in registry.campaigns:
        raise HTTPException(
            status_code=404,
            detail=f"Campaign not found: {campaign_id}",
        )

    references = get_campaign_related_entities(registry, campaign_id)
    return [
        {
            "id": reference.id,
            "entity_type": reference.entity_type,
            "name": registry.get_entity(reference.id).name,
        }
        for reference in references
    ]


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


@app.get("/entities/{entity_id}/relationships")
def get_entity_relationship_links(entity_id: str) -> dict[str, list[dict[str, str]]]:
    registry = load_world_registry(WORLD_PATH)

    if registry.get_entity(entity_id) is None:
        raise HTTPException(
            status_code=404,
            detail=f"Entity not found: {entity_id}",
        )

    outgoing, incoming = get_entity_relationships(registry, entity_id)

    def serialize(references: list[EntityReference]) -> list[dict[str, str]]:
        return [
            {
                "id": reference.id,
                "entity_type": reference.entity_type,
                "name": registry.get_entity(reference.id).name,
            }
            for reference in references
        ]

    return {"outgoing": serialize(outgoing), "incoming": serialize(incoming)}


@app.get("/entities/{entity_id}/yaml")
def get_entity_yaml(entity_id: str) -> dict[str, str]:
    """Return the authored YAML source for an entity."""
    registry = load_world_registry(WORLD_PATH)
    if registry.get_entity(entity_id) is None:
        raise HTTPException(status_code=404, detail=f"Entity not found: {entity_id}")

    entity_type = registry.get_entity_type(entity_id)
    model = World if entity_type == "world" else get_entity_model(entity_type or "")
    if model is None:
        raise HTTPException(status_code=500, detail=f"No model configuration found for entity: {entity_id}")

    service = WorldService(WORLD_PATH.parent)
    try:
        content, path = service.read_entity_yaml(entity_id, model)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {"content": content, "path": str(path.relative_to(WORLD_PATH.parent))}


@app.put("/entities/{entity_id}/yaml")
def update_entity_yaml(entity_id: str, payload: dict) -> dict[str, str]:
    """Validate and save edited YAML source for an existing entity."""
    content = payload.get("content")
    if not isinstance(content, str):
        raise HTTPException(status_code=422, detail="content must be a string.")

    registry = load_world_registry(WORLD_PATH)
    if registry.get_entity(entity_id) is None:
        raise HTTPException(status_code=404, detail=f"Entity not found: {entity_id}")

    entity_type = registry.get_entity_type(entity_id)
    model = World if entity_type == "world" else get_entity_model(entity_type or "")
    if model is None:
        raise HTTPException(status_code=500, detail=f"No model configuration found for entity: {entity_id}")

    service = WorldService(WORLD_PATH.parent)
    try:
        path = service.update_entity_yaml(entity_id, model, content)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {"id": entity_id, "path": str(path.relative_to(WORLD_PATH.parent))}


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

    _, incoming_references = get_entity_relationships(registry, entity_id)
    if incoming_references:
        reference_names = [
            registry.get_entity(reference.id).name
            for reference in incoming_references
            if registry.get_entity(reference.id) is not None
        ]
        raise HTTPException(
            status_code=409,
            detail=(
                f"Cannot delete {entity.name}; it is linked from: "
                f"{', '.join(reference_names)}. Remove those links first."
            ),
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
