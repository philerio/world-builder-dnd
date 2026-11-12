from pathlib import Path

import pytest
import yaml
from fastapi import HTTPException
from pydantic import ValidationError

from worldbuilder.api import app as api_module
from worldbuilder.loaders.entity_loader import load_yaml_directory
from worldbuilder.models.campaign import Campaign
from worldbuilder.models.story import (
    CampaignStory,
    SceneScriptBlock,
    StoryBeat,
    StoryContent,
    StoryEntityLink,
    StoryText,
)
from worldbuilder.services.world_service import WorldService


def test_scene_script_yaml_round_trip_preserves_prose_order_and_campaign_history(
    tmp_path: Path,
) -> None:
    blocks = [
        SceneScriptBlock(
            id="arrival",
            text="Two guards stand at the gates.\n\nTheir crossbows are loaded.",
        ),
        SceneScriptBlock(
            id="greeting",
            kind="dialogue",
            speaker="Left guard",
            text='"Hold there.\nWhat brings you to the city?"',
        ),
        SceneScriptBlock(id="secret", kind="dm_note", text="The guard is nervous."),
    ]
    campaign = Campaign.model_validate(
        {
            "id": "script-campaign",
            "name": "Test campaign",
            "story": {
                "current_beat": "gates",
                "beats": [
                    {
                        "id": "gates",
                        "name": "At the gates",
                        "description": "Keep the summary.",
                        "events": "A patrol might approach.",
                        "scene_script": [block.model_dump() for block in blocks],
                        "consequences": [{"id": "alarm", "description": "Alarm"}],
                    }
                ],
                "player_actions": [{"id": "earlier", "description": "Arrived"}],
                "world_clocks": [{"id": "patrol", "name": "Patrol", "maximum": 4}],
                "session_preps": [{"session": 1, "plot_point_ids": ["gates"]}],
            },
        }
    )
    service = WorldService(tmp_path)
    path = service.save_entity(campaign)
    payload = yaml.safe_load(path.read_text())
    assert payload["story"]["beats"][0]["scene_script"][0]["text"] == blocks[0].text
    restored = load_yaml_directory(tmp_path / "campaigns", Campaign)[0]
    assert isinstance(restored.story, CampaignStory)
    assert restored.story.beats[0].scene_script == blocks
    before = restored.story.model_dump(exclude={"beats"})
    restored.story.beats[0].scene_script = list(reversed(blocks))
    service.update_entity(restored)
    saved = load_yaml_directory(tmp_path / "campaigns", Campaign)[0]
    assert isinstance(saved.story, CampaignStory)
    assert saved.story.model_dump(exclude={"beats"}) == before
    assert saved.story.beats[0].description == "Keep the summary."
    assert saved.story.beats[0].events == "A patrol might approach."
    assert saved.story.beats[0].consequences[0].id == "alarm"
    assert saved.story.beats[0].scene_script == list(reversed(blocks))


def test_scripts_are_optional_and_can_start_as_unwritten_ideas() -> None:
    first = StoryBeat(id="one", name="An idea")
    second = StoryBeat(id="two", name="Another idea")
    assert first.scene_script == []
    first.scene_script.append(SceneScriptBlock(id="draft", kind="dialogue"))
    assert second.scene_script == []
    assert first.scene_script[0].text == ""
    assert first.scene_script[0].speaker is None


@pytest.mark.parametrize(
    "blocks",
    [
        [{"id": "", "text": "Invalid identity"}],
        [{"id": "bad", "kind": "automatic_outcome"}],
        [{"id": "same"}, {"id": "same"}],
    ],
)
def test_invalid_script_identity_and_types_are_rejected(blocks: list[dict]) -> None:
    with pytest.raises(ValidationError):
        StoryBeat(id="beat", name="Test", scene_script=blocks)


def test_existing_plain_and_linked_story_models_remain_compatible() -> None:
    content = StoryContent(
        nodes=[
            StoryText(text="Meet "),
            StoryEntityLink(text="the guard", entity_id="guard"),
        ]
    )
    campaign = Campaign(id="legacy", name="Legacy", story=content)
    restored = Campaign.model_validate_json(campaign.model_dump_json())
    assert isinstance(restored.story, StoryContent)
    assert restored.story == content
    planner = Campaign(id="planner", name="Planner", story=CampaignStory())
    assert isinstance(
        Campaign.model_validate_json(planner.model_dump_json()).story, CampaignStory
    )


def test_api_update_keeps_scripts_and_rejects_invalid_blocks(
    tmp_path, monkeypatch
) -> None:
    world_path = tmp_path / "world.yaml"
    world_path.write_text(
        "id: script-test\nname: Script Test\nversion: '1'\nauthor: Test\ncontinents: []\n"
    )
    service = WorldService(tmp_path)
    campaign = Campaign(
        id="test-script",
        name="Test script",
        story=CampaignStory(beats=[StoryBeat(id="gates", name="Gates")]),
    )
    path = service.save_entity(campaign)
    monkeypatch.setattr(api_module, "WORLD_PATH", world_path)
    payload = campaign.model_dump(mode="json")
    blocks = [
        {
            "id": "one",
            "kind": "dialogue",
            "speaker": "Guard",
            "text": "Hello.\n\nWelcome.",
        }
    ]
    payload["story"]["beats"][0]["scene_script"] = blocks
    response = api_module.update_entity(campaign.id, payload)
    assert response["entity"]["story"]["beats"][0]["scene_script"] == blocks
    assert (
        yaml.safe_load(path.read_text())["story"]["beats"][0]["scene_script"] == blocks
    )
    before = path.read_bytes()
    payload["story"]["beats"][0]["scene_script"] = [{"id": "one", "kind": "invalid"}]
    with pytest.raises(HTTPException) as error:
        api_module.update_entity(campaign.id, payload)
    assert error.value.status_code == 422
    assert path.read_bytes() == before
