from worldbuilder.models.campaign import Campaign, CampaignArcSection
from worldbuilder.models.story import CampaignStory, SessionRecap


def test_campaign_creation() -> None:
    campaign = Campaign(
        id="white-rabbit-incident",
        name="White Rabbit Incident",
        description="A strange magical incident in Reqrun.",
        overview="A festival in Reqrun is disrupted by a magical incident.",
        overarching_plot="The party's choices will shape the return of an ancient threat.",
        overarching_plot_sections=[CampaignArcSection(id="main-arc", title="The awakening", content="An ancient threat begins to return.")],
        world_stories=["bane-influence"],
        status="completed",
        locations=["reqrun"],
        npcs=["bill", "albert"],
        player_characters=["placeholder-pc"],
        outcome="The White Rabbit was defeated.",
        consequences=(
            "Bill became the Defender of Reqrun and "
            "Albert became the Guardian of the Roads."
        ),
    )

    assert campaign.id == "white-rabbit-incident"
    assert campaign.name == "White Rabbit Incident"
    assert campaign.status == "completed"
    assert campaign.overarching_plot is not None
    assert campaign.overarching_plot_sections[0].title == "The awakening"
    assert campaign.world_stories == ["bane-influence"]
    assert campaign.locations == ["reqrun"]
    assert campaign.npcs == ["bill", "albert"]
    assert campaign.player_characters == ["placeholder-pc"]
    assert campaign.outcome == "The White Rabbit was defeated."
    assert campaign.consequences is not None


def test_campaign_story_supports_optional_session_recaps() -> None:
    assert CampaignStory().session_recaps == []

    story = CampaignStory(
        session_recaps=[
            SessionRecap(
                session=1,
                played_on="2026-10-06",
                summary="The party arrived in Reqrun.",
            )
        ]
    )

    assert story.session_recaps == [
        SessionRecap(
            session=1,
            played_on="2026-10-06",
            summary="The party arrived in Reqrun.",
        )
    ]
