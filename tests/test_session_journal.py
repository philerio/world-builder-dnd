from pathlib import Path

import pytest
import yaml
from fastapi import HTTPException
from pydantic import ValidationError

from worldbuilder.api import app as api_module
from worldbuilder.models.campaign import Campaign
from worldbuilder.models.npc import NPC
from worldbuilder.models.story import CampaignStory, SessionEntry, StoryBeat
from worldbuilder.registry import WorldRegistry
from worldbuilder.services.world_service import WorldService
from worldbuilder.validation.validator import (
    ValidationResult,
    validate_campaign_references,
)


def test_existing_campaigns_keep_separate_optional_journal_lists() -> None:
    first = CampaignStory()
    second = CampaignStory()
    assert first.session_entries == []
    first.session_entries.append(
        SessionEntry(id="note", session=1, description="Remember this")
    )
    assert second.session_entries == []
    assert first.player_actions == []


@pytest.mark.parametrize(
    "change",
    [
        {"session": 0},
        {"session": 1.5},
        {"kind": "party_action"},
        {"description": ""},
        {"id": ""},
    ],
)
def test_invalid_journal_entries_are_rejected(change: dict) -> None:
    with pytest.raises(ValidationError):
        SessionEntry.model_validate(
            {"id": "note", "session": 1, "description": "A note", **change}
        )


def test_duplicate_journal_ids_are_rejected() -> None:
    entry = SessionEntry(id="same", session=1, description="A note")
    with pytest.raises(ValidationError):
        CampaignStory(session_entries=[entry, entry])


def test_journal_and_summary_survive_api_and_yaml_without_changing_npc_canon(
    tmp_path: Path, monkeypatch
) -> None:
    world_path = tmp_path / "world.yaml"
    world_path.write_text(
        "id: journal-world\nname: Journal World\nversion: '1'\nauthor: Test\ncontinents: []\n"
    )
    monkeypatch.setattr(api_module, "WORLD_PATH", world_path)
    service = WorldService(tmp_path)
    npc_path = service.save_entity(
        NPC(id="guard", name="Guard", secrets=["Keep this secret"])
    )
    npc_before = npc_path.read_bytes()
    campaign = Campaign.model_validate(
        {
            "id": "journal-campaign",
            "name": "Journal Campaign",
            "story": {
                "current_beat": "gate",
                "beats": [
                    {
                        "id": "gate",
                        "name": "At the gate",
                        "scene_script": [
                            {
                                "id": "speech",
                                "kind": "dialogue",
                                "speaker": "Guard",
                                "text": "Hello",
                            }
                        ],
                        "consequences": [
                            {
                                "id": "alarm",
                                "description": "An alarm may sound",
                                "status": "pending",
                            }
                        ],
                    }
                ],
                "player_actions": [
                    {"id": "party", "description": "The party lied", "session": 3}
                ],
                "world_clocks": [
                    {"id": "patrol", "name": "Patrol", "current": 1, "maximum": 4}
                ],
                "session_entries": [
                    {
                        "id": "reaction",
                        "session": 3,
                        "kind": "npc_action",
                        "description": "The guard looks away.\n\nHe sends for help.",
                        "npc_ids": ["guard"],
                        "story_beat": "gate",
                        "source_action_id": "party",
                        "consequence_ids": ["alarm"],
                    },
                    {
                        "id": "private",
                        "session": 3,
                        "kind": "dm_note",
                        "description": "Secret motive",
                        "source_entry_id": "reaction",
                    },
                    {
                        "id": "world",
                        "session": 3,
                        "kind": "world_change",
                        "description": "The bridge closes",
                    },
                    {
                        "id": "task",
                        "session": 3,
                        "kind": "follow_up",
                        "description": "Prepare a guard captain",
                        "resolved": False,
                    },
                ],
                "session_recaps": [
                    {
                        "session": 3,
                        "summary": "The party arrived at the gate.",
                        "notes": "Secret motive\n\nPrepare next time.",
                    }
                ],
            },
        }
    )
    path = service.save_entity(campaign)
    before = yaml.safe_load(path.read_text())
    payload = campaign.model_dump(mode="json")
    payload["story"]["session_entries"][0]["description"] += (
        "\nHe remembers their faces."
    )
    response = api_module.update_entity(campaign.id, payload)
    saved = yaml.safe_load(path.read_text())
    assert (
        saved["story"]["session_entries"]
        == response["entity"]["story"]["session_entries"]
    )
    assert saved["story"]["session_entries"][0]["source_action_id"] == "party"
    assert saved["story"]["session_entries"][1]["source_entry_id"] == "reaction"
    for field in [
        "beats",
        "player_actions",
        "world_clocks",
        "current_beat",
        "session_recaps",
    ]:
        assert saved["story"][field] == before["story"][field]
    assert npc_path.read_bytes() == npc_before
    original = path.read_bytes()
    payload["story"]["session_entries"][0]["session"] = 0
    with pytest.raises(HTTPException) as error:
        api_module.update_entity(campaign.id, payload)
    assert error.value.status_code == 422
    assert path.read_bytes() == original


def test_data_health_reports_removed_journal_references() -> None:
    registry = WorldRegistry()
    campaign = Campaign(
        id="test",
        name="Test",
        story=CampaignStory(
            beats=[StoryBeat(id="gate", name="Gate")],
            session_entries=[
                SessionEntry(
                    id="note",
                    session=1,
                    kind="npc_action",
                    description="An NPC reacts",
                    npc_ids=["missing-npc"],
                    story_beat="missing-beat",
                    source_action_id="missing-action",
                    source_entry_id="note",
                    consequence_ids=["missing-consequence"],
                )
            ],
        ),
    )
    result = ValidationResult()
    validate_campaign_references(result, campaign, registry)
    assert len(result.errors) == 5
    assert any("missing-npc" in error for error in result.errors)
    assert any("source journal entry" in error for error in result.errors)
