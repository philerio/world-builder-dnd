from concurrent.futures import ThreadPoolExecutor
import asyncio
import json
from pathlib import Path

import pytest
import yaml
from fastapi import HTTPException
from pydantic import ValidationError

from worldbuilder.api.combat import create_combat_router, preserve_combat_history
from worldbuilder.models.campaign import Campaign
from worldbuilder.models.combat import CombatEncounter, CombatResult, CombatStats
from worldbuilder.models.story import CampaignStory, StoryContent


@pytest.fixture
def bridge(tmp_path):
    def write(relative, data):
        path = tmp_path / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(data, sort_keys=False), encoding="utf-8")
        return path
    world = write("world.yaml", {"id": "world-1", "name": "Test World", "version": "1", "author": "Test", "continents": []})
    write("npcs/guard.yaml", {"id": "guard", "name": "Guard", "race": "Human", "secrets": ["Secret allegiance"]})
    write("player_characters/hero.yaml", {"id": "hero", "name": "Hero", "race": "Elf"})
    encounter = {"id": "ambush", "name": "Ambush", "map_id": "battle", "location_id": "inn", "participants": [{"id": "guards", "entity_id": "guard", "quantity": 2, "stats": {"hp": 12, "ac": 14}}]}
    campaign = write("campaigns/authored-name.yaml", {"id": "campaign", "name": "Campaign", "npcs": ["guard"], "player_characters": ["hero"], "status": "active", "custom_authored_field": "preserve", "story": {"beats": [{"id": "beat", "name": "At the inn", "status": "planned", "description_content": {"nodes": [{"type": "entity_link", "text": "Guard", "entity_id": "guard"}]}, "encounter": encounter}], "player_actions": [{"id": "old-action", "description": "Earlier action"}], "world_clocks": [{"id": "clock", "name": "Danger", "current": 1, "maximum": 4}]}})
    write("locations/inn.yaml", {"id": "inn", "name": "The Inn"})
    write("maps/battle.yaml", {"id": "battle", "name": "Battle map", "image_path": "images/battle.png"})
    (tmp_path / "images").mkdir()
    (tmp_path / "images/battle.png").write_bytes(b"\x89PNG\r\n\x1a\nimage")
    routes = create_combat_router(lambda: world).routes
    endpoints = {route.path.removeprefix("/integrations/combat"): route.endpoint for route in routes}
    return tmp_path, campaign, endpoints


def report(identifier="result"):
    return CombatResult(version=1, reviewed=True, id=identifier, world_id="world-1", campaign_id="campaign", story_beat="beat", encounter_id="ambush", title="Inn battle", summary="The guards fled.", rounds=3, session=2, participants=[{"local_id": "local-guard", "entity_id": "guard", "name": "Guard", "allegiance": "enemy", "health": 0, "max_hp": 12, "outcome": "Escaped alive"}])


def test_catalog_and_reference_preserve_world_ids_and_do_not_write(bridge):
    root, campaign, endpoints = bridge
    original = campaign.read_bytes()
    catalog = endpoints["/catalog"]()
    assert catalog["world_id"] == "world-1"
    assert catalog["campaigns"][0]["player_characters"] == ["hero"]
    assert catalog["campaigns"][0]["beats"][0]["encounter"]["participants"][0]["quantity"] == 2
    assert endpoints["/characters/{entity_id}"]("guard")["character"]["secrets"] == ["Secret allegiance"]
    assert campaign.read_bytes() == original


def test_result_is_appended_once_without_changing_canon(bridge):
    root, campaign, endpoints = bridge
    before = yaml.safe_load(campaign.read_text())
    npc_before = (root / "npcs/guard.yaml").read_bytes()
    save = endpoints["/results"]
    assert save(report())["already_saved"] is False
    assert save(report())["already_saved"] is True
    after = yaml.safe_load(campaign.read_text())
    assert len(after["story"]["combat_results"]) == 1
    assert len(after["story"]["player_actions"]) == 2
    action = after["story"]["player_actions"][-1]
    assert "Escaped alive" in action["description"] and action["session"] == 2
    assert action["reviewed"] is False
    assert after["story"]["beats"] == before["story"]["beats"]
    assert after["story"]["world_clocks"] == before["story"]["world_clocks"]
    assert after["custom_authored_field"] == "preserve" and after["status"] == "active"
    assert (root / "npcs/guard.yaml").read_bytes() == npc_before
    assert any(root.rglob("*.bak")) or any(root.rglob("*backup*"))


def test_conflicting_retry_wrong_world_and_missing_beat_are_rejected(bridge):
    _, _, endpoints = bridge
    save = endpoints["/results"]
    save(report())
    for changed in [report().model_copy(update={"summary": "Different"}), report("other").model_copy(update={"world_id": "other-world"}), report("other").model_copy(update={"story_beat": "missing"})]:
        with pytest.raises(HTTPException) as error:
            save(changed)
        assert error.value.status_code == 409


def test_two_concurrent_results_both_survive(bridge):
    _, campaign, endpoints = bridge
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(endpoints["/results"], [report("a"), report("b")]))
    assert {item["id"] for item in yaml.safe_load(campaign.read_text())["story"]["combat_results"]} == {"a", "b"}


def test_stale_campaign_editor_cannot_erase_imported_history(bridge):
    _, campaign, endpoints = bridge
    stale = yaml.safe_load(campaign.read_text())
    endpoints["/results"](report())
    current = Campaign.model_validate(yaml.safe_load(campaign.read_text()))
    with pytest.raises(HTTPException) as error:
        preserve_combat_history(current, stale)
    assert error.value.status_code == 409
    preserve_combat_history(current, current.model_dump(mode="json"))
    with pytest.raises(HTTPException) as error:
        preserve_combat_history(current, {"story": {"combat_results": None}})
    assert error.value.status_code == 409


def test_campaign_api_editors_reject_stale_history_and_preserve_valid_edits(bridge, monkeypatch):
    from worldbuilder.api import app as api_module
    root, campaign, endpoints = bridge
    monkeypatch.setattr(api_module, "WORLD_PATH", root / "world.yaml")
    stale = yaml.safe_load(campaign.read_text())
    endpoints["/results"](report())
    with pytest.raises(HTTPException) as error:
        api_module.update_entity("campaign", stale)
    assert error.value.status_code == 409
    with pytest.raises(HTTPException) as error:
        api_module.update_entity_yaml("campaign", {"content": yaml.safe_dump(stale)})
    assert error.value.status_code == 409
    current = yaml.safe_load(campaign.read_text())
    current["name"] = "Renamed campaign"
    saved = api_module.update_entity("campaign", current)
    assert saved["entity"]["name"] == "Renamed campaign"
    assert len(saved["entity"]["story"]["combat_results"]) == 1


def test_fastapi_exchange_parses_and_validates_the_reviewed_report(bridge, monkeypatch):
    from worldbuilder.api import app as api_module
    root, _, _ = bridge
    monkeypatch.setattr(api_module, "WORLD_PATH", root / "world.yaml")

    async def post(payload):
        messages = []
        delivered = False
        async def receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": json.dumps(payload).encode(), "more_body": False}
            await asyncio.Event().wait()
            return {"type": "http.disconnect"}
        async def send(message):
            messages.append(message)
        scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": "POST", "scheme": "http", "path": "/integrations/combat/results", "raw_path": b"/integrations/combat/results", "query_string": b"", "root_path": "", "headers": [(b"content-type", b"application/json")], "client": ("127.0.0.1", 1234), "server": ("localhost", 8000)}
        await asyncio.wait_for(api_module.app(scope, receive, send), timeout=10)
        status = next(item["status"] for item in messages if item["type"] == "http.response.start")
        return status
    assert asyncio.run(post({**report().model_dump(), "reviewed": False})) == 422
    assert asyncio.run(post(report().model_dump())) == 200
    assert asyncio.run(post(report().model_dump())) == 200


def test_legacy_story_remains_legacy_and_result_does_not_replace_it(bridge):
    _, campaign, endpoints = bridge
    raw = yaml.safe_load(campaign.read_text())
    raw["story"] = {"nodes": [{"type": "text", "text": "Authored legacy story"}]}
    campaign.write_text(yaml.safe_dump(raw))
    assert isinstance(Campaign.model_validate(raw).story, StoryContent)
    original = campaign.read_bytes()
    with pytest.raises(HTTPException) as error:
        endpoints["/results"](report())
    assert error.value.status_code == 409
    assert campaign.read_bytes() == original
    assert CampaignStory().combat_results == []


def test_image_is_local_and_path_escape_is_rejected(bridge):
    root, _, endpoints = bridge
    image = endpoints["/maps/{map_id}/image"]("battle")
    assert Path(image.path) == root / "images/battle.png"
    map_path = root / "maps/battle.yaml"
    raw = yaml.safe_load(map_path.read_text())
    for address in [None, "https://example.com/map.png", "../../outside.png"]:
        raw["image_path"] = address
        map_path.write_text(yaml.safe_dump(raw))
        with pytest.raises(HTTPException):
            endpoints["/maps/{map_id}/image"]("battle")


@pytest.mark.parametrize("quantity", [0, 1.5, 101])
def test_bad_encounter_quantities_are_rejected(quantity):
    with pytest.raises(ValidationError):
        CombatEncounter(id="e", name="Encounter", participants=[{"id": "p", "name": "Enemy", "quantity": quantity}])


def test_ability_scores_are_strict_and_party_has_one_token():
    with pytest.raises(ValidationError):
        CombatStats(abilities={"Strength": "14"})
    with pytest.raises(ValidationError):
        CombatEncounter(id="e", name="Encounter", participants=[{"id": "p", "name": "Hero", "allegiance": "party", "quantity": 2}])
    with pytest.raises(ValidationError):
        CombatResult.model_validate({**report().model_dump(), "reviewed": False})
