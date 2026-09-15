from pathlib import Path

from worldbuilder.models.artifact import Artifact
from worldbuilder.models.campaign import Campaign
from worldbuilder.models.lore import Lore
from worldbuilder.models.map import Map
from worldbuilder.models.map_marker import MapMarker
from worldbuilder.models.story import StoryContent, StoryEntityLink, StoryText
from worldbuilder.services.world_service import WorldService


def test_world_service_saves_entity(tmp_path: Path) -> None:
    service = WorldService(tmp_path)

    lore = Lore(
        id="test-lore",
        name="Test Lore",
        description="A test entry.",
    )

    path = service.save_entity(lore)

    assert path == tmp_path / "lore" / "test-lore.yaml"
    assert path.exists()

def test_world_service_saves_artifact(tmp_path: Path) -> None:
    service = WorldService(tmp_path)

    artifact = Artifact(
        id="test-artifact",
        name="Test Artifact",
        description="An artifact used for automated tests.",
    )

    path = service.save_entity(artifact)

    assert path == tmp_path / "artifacts" / "test-artifact.yaml"
    assert path.exists()

def test_world_service_saves_campaign_story(tmp_path: Path) -> None:
    service = WorldService(tmp_path)

    campaign = Campaign(
        id="test-campaign",
        name="Test Campaign",
        story=StoryContent(
            nodes=[
                StoryText(text="The party discovered "),
                StoryEntityLink(
                    text="an ancient artifact",
                    entity_id="test-artifact",
                ),
            ]
        ),
    )

    path = service.save_entity(campaign)

    loaded = service.get_entity(
        "test-campaign",
        Campaign,
    )

    assert path == tmp_path / "campaigns" / "test-campaign.yaml"
    assert loaded.story is not None
    assert len(loaded.story.nodes) == 2
    assert loaded.story.nodes[0].text == "The party discovered "
    assert loaded.story.nodes[1].text == "an ancient artifact"
    assert loaded.story.nodes[1].entity_id == "test-artifact"

def test_world_service_saves_map_with_markers(tmp_path: Path) -> None:
    service = WorldService(tmp_path)

    world_map = Map(
        id="test-map",
        name="Test Map",
        map_type="region",
        parent_map="test-parent-map",
        markers=[
            MapMarker(
                id="test-city-marker",
                entity_id="test-city",
                x=42.5,
                y=67.2,
                label="Test City",
            )
        ],
    )

    path = service.save_entity(world_map)

    loaded = service.get_entity(
        "test-map",
        Map,
    )

    assert path == tmp_path / "maps" / "test-map.yaml"
    assert loaded.name == "Test Map"
    assert loaded.map_type == "region"
    assert loaded.parent_map == "test-parent-map"
    assert len(loaded.markers) == 1
    assert loaded.markers[0].entity_id == "test-city"
    assert loaded.markers[0].x == 42.5
    assert loaded.markers[0].y == 67.2