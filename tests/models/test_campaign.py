from worldbuilder.models.campaign import Campaign
from worldbuilder.models.story import CampaignStory, SessionRecap


def test_campaign_creation() -> None:
    campaign = Campaign(
        id="white-rabbit-incident",
        name="White Rabbit Incident",
        description="A strange magical incident in Reqrun.",
        overview="A festival in Reqrun is disrupted by a magical incident.",
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
