from worldbuilder.models.campaign import Campaign
from worldbuilder.models.lore import Lore
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.models.world_event import WorldEvent
from worldbuilder.registry import WorldRegistry
from worldbuilder.relationships import get_campaign_related_entities
from worldbuilder.validation.validator import (
    ValidationResult,
    validate_lore_references,
)


def test_campaign_related_entities_includes_events_and_lore() -> None:
    registry = WorldRegistry()
    registry.add_campaign(Campaign(id="campaign-one", name="Campaign One"))
    registry.add_world_event(
        WorldEvent(
            id="current-crisis",
            name="Current Crisis",
            campaigns=["campaign-one"],
        )
    )
    registry.add_timeline_event(
        TimelineEvent(
            id="old-battle",
            name="Old Battle",
            campaigns=["campaign-one"],
        )
    )
    registry.add_lore(
        Lore(
            id="local-custom",
            name="Local Custom",
            campaigns=["campaign-one"],
        )
    )

    references = get_campaign_related_entities(registry, "campaign-one")

    assert [(item.entity_type, item.id) for item in references] == [
        ("lore", "local-custom"),
        ("timeline_event", "old-battle"),
        ("world_event", "current-crisis"),
    ]


def test_lore_campaign_references_are_validated() -> None:
    registry = WorldRegistry()
    lore = Lore(
        id="local-custom",
        name="Local Custom",
        campaigns=["missing-campaign"],
    )
    result = ValidationResult()

    validate_lore_references(result, lore, registry)

    assert not result.is_valid
    assert "Unknown campaign ID: missing-campaign" in result.errors
