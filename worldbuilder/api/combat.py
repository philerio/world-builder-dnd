"""Small optional bridge. Results append reviewed history without changing canon/status."""
import base64
import binascii
from functools import wraps
from pathlib import Path
from threading import RLock
from typing import Callable

import yaml
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response

from worldbuilder.loaders.world_loader import load_world_registry
from worldbuilder.models.combat import CombatResult
from worldbuilder.models.story import CampaignStory
from worldbuilder.services.world_service import WorldService

write_lock = RLock()


def serialized_world_write(handler):
    """Keep campaign editor writes ordered with result appends in this API process."""
    @wraps(handler)
    def wrapped(*args, **kwargs):
        with write_lock:
            return handler(*args, **kwargs)
    return wrapped

CHARACTER_FIELDS = {"id", "name", "race", "role", "description", "details", "motives", "goals", "fears", "secrets", "knowledge", "city", "region", "kingdom", "updated"}
IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


def preserve_combat_history(existing, payload: dict) -> None:
    """Reject stale full-record edits which would erase newly arrived result history."""
    if not isinstance(getattr(existing, "story", None), CampaignStory):
        return
    stored = {result.id for result in existing.story.combat_results}
    incoming_story = payload.get("story") or {}
    incoming_results = incoming_story.get("combat_results", []) if isinstance(incoming_story, dict) else []
    incoming = {item.get("id") for item in incoming_results if isinstance(item, dict)} if isinstance(incoming_results, list) else set()
    if not stored.issubset(incoming):
        raise HTTPException(409, "Combat results arrived after this campaign was loaded. Reload the campaign before saving.")


def create_combat_router(world_path: Callable[[], Path]) -> APIRouter:
    router = APIRouter(prefix="/integrations/combat", tags=["Optional combat connection"])

    def registry():
        return load_world_registry(world_path())

    def character_snapshot(reg, entity_id: str):
        character = reg.npcs.get(entity_id) or reg.player_characters.get(entity_id)
        if character is None:
            raise HTTPException(404, f"World character not found: {entity_id}")
        entity_type = "npc" if entity_id in reg.npcs else "player_character"
        return {**character.model_dump(mode="json", include=CHARACTER_FIELDS), "entity_type": entity_type}

    @router.get("/catalog")
    def catalog():
        reg = registry()
        world = next(iter(reg.worlds.values()))
        campaigns = []
        for campaign in reg.campaigns.values():
            beats = campaign.story.beats if isinstance(campaign.story, CampaignStory) else []
            campaigns.append({
                "id": campaign.id, "name": campaign.name,
                "player_characters": campaign.player_characters, "npcs": campaign.npcs,
                "beats": [beat.model_dump(mode="json", include={"id", "name", "description", "locations", "encounter"}) for beat in beats],
            })
        return {
            "version": 1, "world_id": world.id, "world_name": world.name,
            "campaigns": campaigns,
            "characters": [character_snapshot(reg, key) for key in [*reg.player_characters, *reg.npcs]],
            "maps": [item.model_dump(mode="json", include={"id", "name", "image_path", "entity_id"}) for item in reg.maps.values()],
            "locations": [{"id": item.id, "name": item.name} for item in [*reg.locations.values(), *reg.cities.values(), *reg.regions.values(), *reg.kingdoms.values()]],
        }

    @router.get("/characters/{entity_id}")
    def character(entity_id: str):
        reg = registry()
        return {"world_id": next(iter(reg.worlds.values())).id, "character": character_snapshot(reg, entity_id)}

    @router.get("/maps/{map_id}/image")
    def map_image(map_id: str):
        item = registry().maps.get(map_id)
        if item is None:
            raise HTTPException(404, "World map not found.")
        image = item.image_path
        if not image:
            raise HTTPException(422, "This map is a schematic. Choose a battle-map image for combat.")
        if image.startswith("data:"):
            try:
                header, encoded = image.split(",", 1)
                media_type = header.removeprefix("data:").removesuffix(";base64")
                if not header.endswith(";base64") or media_type not in IMAGE_TYPES.values() or len(encoded) > MAX_IMAGE_BYTES * 4 // 3 + 4:
                    raise ValueError("Unsupported image")
                content = base64.b64decode(encoded, validate=True)
                if len(content) > MAX_IMAGE_BYTES:
                    raise ValueError("Oversized image")
                return Response(content, media_type=media_type)
            except (ValueError, binascii.Error):
                raise HTTPException(422, "Choose a raster battle-map image of at most 10 MB.") from None
        if "://" in image:
            raise HTTPException(422, "Save this map image in World Builder's public/maps folder to share it offline.")
        root = world_path().parent.resolve()
        public = Path(__file__).resolve().parents[2] / "frontend" / "public"
        relative = image.lstrip("/")
        candidates = [public / relative, root / relative]
        if relative.startswith("map-assets/"):
            candidates.insert(0, root / "map_assets" / Path(relative).name)
        for candidate in candidates:
            resolved = candidate.resolve()
            if not any(resolved.is_relative_to(allowed.resolve()) for allowed in [public, root]):
                continue
            if resolved.is_file() and resolved.suffix.lower() in IMAGE_TYPES:
                if resolved.stat().st_size > MAX_IMAGE_BYTES:
                    raise HTTPException(413, "Battle-map images must be 10 MB or smaller.")
                return FileResponse(resolved, media_type=IMAGE_TYPES[resolved.suffix.lower()])
        raise HTTPException(404, "Map image not found in World Builder's public/maps or world folders.")

    @router.post("/results")
    def receive_result(report: CombatResult):
        with write_lock:
            reg = registry()
            if report.world_id != next(iter(reg.worlds.values())).id:
                raise HTTPException(409, "This result belongs to a different world.")
            campaign = reg.campaigns.get(report.campaign_id)
            if campaign is None:
                raise HTTPException(404, "Campaign not found.")
            if campaign.story is not None and not isinstance(campaign.story, CampaignStory):
                raise HTTPException(409, "Use the campaign Story Planner before sending combat results; its legacy story is preserved.")
            story = campaign.story or CampaignStory()
            previous = next((item for item in story.combat_results if item.id == report.id), None)
            if previous:
                if previous != report:
                    raise HTTPException(409, "This result ID was already used for a different summary.")
                return {"id": report.id, "already_saved": True}
            if report.story_beat and not any(beat.id == report.story_beat for beat in story.beats):
                raise HTTPException(409, "The linked plot point no longer exists. Choose another destination.")
            if report.encounter_id and not any(beat.encounter and beat.encounter.id == report.encounter_id and (not report.story_beat or beat.id == report.story_beat) for beat in story.beats):
                raise HTTPException(409, "The linked encounter no longer exists.")
            # Preserve every existing YAML field, including fields outside current model schemas.
            directory = world_path().parent / "campaigns"
            for source in directory.glob("*.yaml"):
                raw = yaml.safe_load(source.read_text(encoding="utf-8"))
                if isinstance(raw, dict) and raw.get("id") == campaign.id:
                    break
            else:
                raise HTTPException(404, "Campaign source not found.")
            raw_story = raw.setdefault("story", {}) or {}
            raw["story"] = raw_story
            raw_story.setdefault("beats", [])
            raw_story.setdefault("player_actions", [])
            raw_story.setdefault("world_clocks", [])
            raw_story.setdefault("combat_results", []).append(report.model_dump(mode="json", exclude_none=True))
            outcomes = "\n".join(f"{item.name} ({item.allegiance}): HP {item.health:g}/{item.max_hp:g}" + (f"; {item.outcome}" if item.outcome else "") for item in report.participants)
            action = {"id": f"combat-{report.id}", "description": f"{report.title}\n\n{report.summary}\n\nRounds: {report.rounds}" + (f"\n{outcomes}" if outcomes else ""), "reviewed": False,
                      "notes": "Imported reviewed combat summary. Story consequences and character fate remain DM decisions."}
            if report.session is not None:
                action["session"] = report.session
            if report.story_beat:
                action["story_beat"] = report.story_beat
            raw_story["player_actions"].append(action)
            WorldService(world_path().parent).update_yaml_source("campaign", source.name, yaml.safe_dump(raw, sort_keys=False, allow_unicode=True))
            return {"id": report.id, "already_saved": False}

    return router
