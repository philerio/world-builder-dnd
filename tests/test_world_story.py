from worldbuilder.models.campaign import Campaign
from worldbuilder.models.story import CampaignStory, PlayerAction, StoryBeat, StoryConsequence, WorldStoryThreadLink
from worldbuilder.models.story import WorldClock
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.models.world_event import WorldEvent
from worldbuilder.models.world_story import WorldStory
from worldbuilder.registry.registry import WorldRegistry
from worldbuilder.relationships import get_campaign_related_entities, get_related_entities
from worldbuilder.validation.validator import (
    ValidationResult,
    validate_campaign_references,
    validate_timeline_event_references,
    validate_world_event_references,
)


def test_world_story_accepts_proposed_campaign_contributions() -> None:
    story = WorldStory.model_validate(
        {
            "id": "bane-overarching-story",
            "name": "Bane's Influence",
            "characters": ["bane"],
            "contributions": [
                {
                    "campaign_id": "the-unforgiven",
                    "source_type": "campaign_outcome",
                    "summary": "The campaign outcome may connect to this story.",
                    "connection_status": "proposed",
                }
            ],
        }
    )

    assert story.contributions[0].connection_status == "proposed"
    assert story.threads == []


def test_world_story_can_track_background_clocks() -> None:
    story = WorldStory(
        id="bane-story",
        name="Bane's Influence",
        world_clocks=[
            WorldClock(
                id="bane-influence",
                name="Bane's Influence",
                maximum=4,
                stages=["First sign", "Second sign"],
            )
        ],
    )

    assert story.world_clocks[0].current == 0
    assert story.world_clocks[0].maximum == 4


def test_registry_indexes_world_stories_as_entities() -> None:
    registry = WorldRegistry()
    story = WorldStory(id="bane-story", name="Bane's Influence")

    registry.add_world_story(story)

    assert registry.get_entity(story.id) is story
    assert registry.get_entity_type(story.id) == "world_story"


def test_campaign_references_include_proposed_world_story_link() -> None:
    registry = WorldRegistry()
    campaign = Campaign(id="campaign-one", name="Campaign One")
    story = WorldStory(
        id="world-story-one",
        name="World Story One",
        contributions=[
            {
                "campaign_id": campaign.id,
                "summary": "A possible relationship, pending DM review.",
            }
        ],
    )
    registry.add_campaign(campaign)
    registry.add_world_story(story)

    references = get_campaign_related_entities(registry, campaign.id)

    assert (story.id, "world_story") in [
        (reference.id, reference.entity_type) for reference in references
    ]


def test_tagged_consequence_surfaces_world_story_as_campaign_reference() -> None:
    registry = WorldRegistry()
    story = WorldStory(id="world-story-one", name="World Story One")
    campaign = Campaign(
        id="campaign-one",
        name="Campaign One",
        story=CampaignStory(
            beats=[
                StoryBeat(
                    id="plot-point-one",
                    name="Plot Point One",
                    consequences=[
                        StoryConsequence(
                            id="consequence-one",
                            description="The party changes something important.",
                            world_stories=[story.id],
                        )
                    ],
                )
            ]
        ),
    )
    registry.add_world_story(story)
    registry.add_campaign(campaign)

    references = get_campaign_related_entities(registry, campaign.id)

    assert [(reference.id, reference.entity_type) for reference in references] == [
        (story.id, "world_story")
    ]


def test_tagged_player_action_surfaces_world_story_as_campaign_reference() -> None:
    registry = WorldRegistry()
    story = WorldStory(id="world-story-one", name="World Story One")
    campaign = Campaign(
        id="campaign-one",
        name="Campaign One",
        story=CampaignStory(
            player_actions=[
                PlayerAction(
                    id="action-one",
                    description="The party exposes a hidden agent.",
                    world_stories=[story.id],
                )
            ]
        ),
    )
    registry.add_world_story(story)
    registry.add_campaign(campaign)

    references = get_campaign_related_entities(registry, campaign.id)

    assert [(reference.id, reference.entity_type) for reference in references] == [
        (story.id, "world_story")
    ]


def test_player_action_world_story_tags_are_validated() -> None:
    campaign = Campaign(
        id="campaign-one",
        name="Campaign One",
        story=CampaignStory(
            player_actions=[
                PlayerAction(
                    id="action-one",
                    description="The party exposes a hidden agent.",
                    world_stories=["missing-story"],
                )
            ]
        ),
    )
    result = ValidationResult()

    validate_campaign_references(result, campaign, WorldRegistry())

    assert "Unknown world story ID: missing-story" in result.errors


def test_plot_point_and_thread_tags_surface_world_story_as_campaign_reference() -> None:
    registry = WorldRegistry()
    story = WorldStory(
        id="world-story-one",
        name="World Story One",
        threads=[{"id": "bane-awakens", "name": "Bane Awakens"}],
    )
    campaign = Campaign(
        id="campaign-one",
        name="Campaign One",
        story=CampaignStory(
            beats=[
                StoryBeat(
                    id="plot-point-one",
                    name="Plot Point One",
                    world_story_threads=[WorldStoryThreadLink(world_story_id=story.id, thread_id="bane-awakens")],
                )
            ]
        ),
    )
    registry.add_world_story(story)
    registry.add_campaign(campaign)

    result = ValidationResult()
    validate_campaign_references(result, campaign, registry)
    references = get_campaign_related_entities(registry, campaign.id)

    assert result.is_valid
    assert [(reference.id, reference.entity_type) for reference in references] == [(story.id, "world_story")]


def test_unknown_world_story_thread_is_rejected() -> None:
    registry = WorldRegistry()
    story = WorldStory(id="world-story-one", name="World Story One", threads=[])
    registry.add_world_story(story)
    campaign = Campaign(
        id="campaign-one",
        name="Campaign One",
        story=CampaignStory(
            player_actions=[
                PlayerAction(
                    id="action-one",
                    description="A player action.",
                    world_story_threads=[WorldStoryThreadLink(world_story_id=story.id, thread_id="missing-thread")],
                )
            ]
        ),
    )
    result = ValidationResult()

    validate_campaign_references(result, campaign, registry)

    assert "Unknown thread ID in world story world-story-one: missing-thread" in result.errors


def test_resolved_world_event_can_link_to_timeline_event_both_ways() -> None:
    registry = WorldRegistry()
    event = WorldEvent(id="world-event-one", name="The Crisis", status="resolved", timeline_event_id="crisis-history")
    timeline = TimelineEvent(id="crisis-history", name="The Crisis", source_world_event_id=event.id)
    registry.add_world_event(event)
    registry.add_timeline_event(timeline)
    world_event_result = ValidationResult()
    timeline_result = ValidationResult()

    validate_world_event_references(world_event_result, event, registry)
    validate_timeline_event_references(timeline_result, timeline, registry)

    assert world_event_result.is_valid
    assert timeline_result.is_valid
    assert ("crisis-history", "timeline_event") in [
        (reference.id, reference.entity_type) for reference in get_related_entities(registry, event.id)
    ]
    assert (event.id, "world_event") in [
        (reference.id, reference.entity_type) for reference in get_related_entities(registry, timeline.id)
    ]


def test_world_event_tag_surfaces_world_story_in_campaign_references() -> None:
    registry = WorldRegistry()
    story = WorldStory(id="world-story-one", name="World Story One")
    campaign = Campaign(id="campaign-one", name="Campaign One")
    event = WorldEvent(
        id="event-one",
        name="Event One",
        campaigns=[campaign.id],
        world_stories=[story.id],
    )
    registry.add_world_story(story)
    registry.add_campaign(campaign)
    registry.add_world_event(event)

    references = get_campaign_related_entities(registry, campaign.id)

    assert (story.id, "world_story") in [
        (reference.id, reference.entity_type) for reference in references
    ]
