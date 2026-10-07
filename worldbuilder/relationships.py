from pydantic import BaseModel

from worldbuilder.models.reference import EntityReference
from worldbuilder.models.story import CampaignStory
from worldbuilder.registry import WorldRegistry


_NON_REFERENCE_FIELDS = {
    "id",
    "description",
    "details",
    "dm_notes",
    "notes",
    "summary",
    "text",
    "content",
    "name",
    "title",
    "status",
    "role",
    "relationship",
    "trigger",
    "effect",
    "goal",
    "goals",
    "fears",
    "secrets",
    "knowledge",
}


def _referenced_ids(value: object, known_ids: set[str], field_name: str = "") -> set[str]:
    """Find exact entity-ID values in structured entity data, skipping prose fields."""
    if field_name in _NON_REFERENCE_FIELDS:
        return set()

    if isinstance(value, dict):
        references: set[str] = set()
        for key, nested_value in value.items():
            references.update(_referenced_ids(nested_value, known_ids, str(key)))
        return references

    if isinstance(value, (list, tuple, set)):
        references: set[str] = set()
        for nested_value in value:
            references.update(_referenced_ids(nested_value, known_ids, field_name))
        return references

    if isinstance(value, str) and value in known_ids:
        return {value}

    return set()


def get_entity_relationships(
    registry: WorldRegistry,
    entity_id: str,
) -> tuple[list[EntityReference], list[EntityReference]]:
    """Return explicit outgoing and incoming links for an entity."""
    entity = registry.get_entity(entity_id)
    if not isinstance(entity, BaseModel):
        return [], []

    collections = (
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
    )
    entities = [entity for collection in collections for entity in collection.values()]
    known_ids = {entity.id for entity in entities}
    outgoing_ids = _referenced_ids(
        entity.model_dump(mode="python"),
        known_ids,
    ) - {entity_id}
    incoming_ids: set[str] = set()

    for source in entities:
        if source.id == entity_id:
            continue
        if isinstance(source, BaseModel) and entity_id in _referenced_ids(
            source.model_dump(mode="python"), known_ids
        ):
            incoming_ids.add(source.id)

    def to_references(ids: set[str]) -> list[EntityReference]:
        return sorted(
            (
                EntityReference(
                    id=linked_id,
                    entity_type=registry.get_entity_type(linked_id) or "",
                )
                for linked_id in ids
            ),
            key=lambda reference: (reference.entity_type, reference.id),
        )

    return to_references(outgoing_ids), to_references(incoming_ids)


def get_related_entities(
    registry: WorldRegistry,
    entity_id: str,
) -> list[EntityReference]:
    entity = registry.get_entity(entity_id)

    if entity is None:
        return []

    entity_type = registry.get_entity_type(entity_id)

    if entity_type == "campaign":
        return get_campaign_related_entities(registry, entity_id)

    if entity_type == "continent":
        return [
            EntityReference(
                id=kingdom.id,
                entity_type="kingdom",
            )
            for kingdom in registry.kingdoms.values()
            if kingdom.continent == entity_id
        ]

    if entity_type == "kingdom":
        return [
            EntityReference(
                id=city.id,
                entity_type="city",
            )
            for city in registry.cities.values()
            if city.kingdom == entity_id
        ]

    if entity_type in {"location", "city", "region", "kingdom", "continent"}:
        references = [
            EntityReference(id=event.id, entity_type="world_event")
            for event in registry.world_events.values()
            if entity_id in event.locations
        ]
        references.extend(
            EntityReference(id=event.id, entity_type="timeline_event")
            for event in registry.timeline_events.values()
            if entity_id in event.locations
        )
        return references

    if entity_type in {"npc", "player_character"}:
        references = [
            EntityReference(id=event.id, entity_type="world_event")
            for event in registry.world_events.values()
            if entity_id in event.characters
        ]
        references.extend(
            EntityReference(id=event.id, entity_type="timeline_event")
            for event in registry.timeline_events.values()
            if entity_id in event.characters
        )
        return references

    if entity_type == "world_event":
        references = [
            EntityReference(id=story_id, entity_type="world_story")
            for story_id in entity.world_stories
            if story_id in registry.world_stories
        ]
        references.extend(
            EntityReference(id=link.world_story_id, entity_type="world_story")
            for link in entity.world_story_threads
            if link.world_story_id in registry.world_stories
            and link.world_story_id not in {reference.id for reference in references}
        )
        references.extend(
            EntityReference(id=event.timeline_event_id, entity_type="timeline_event")
            for event in [entity]
            if event.timeline_event_id in registry.timeline_events
        )
        references.extend(
            EntityReference(id=timeline_event.id, entity_type="timeline_event")
            for timeline_event in registry.timeline_events.values()
            if timeline_event.source_world_event_id == entity_id
            and timeline_event.id not in {reference.id for reference in references}
        )
        references.extend(
            EntityReference(id=source.campaign_id, entity_type="campaign")
            for source in entity.story_sources
            if source.campaign_id in registry.campaigns
        )
        references.extend(
            EntityReference(id=campaign_id, entity_type="campaign")
            for campaign_id in entity.campaigns
            if campaign_id in registry.campaigns
            and campaign_id not in {reference.id for reference in references}
        )
        return references

    if entity_type == "timeline_event":
        references = []
        if entity.source_world_event_id in registry.world_events:
            references.append(EntityReference(id=entity.source_world_event_id, entity_type="world_event"))
        references.extend(
            EntityReference(id=story_id, entity_type="world_story")
            for story_id in entity.world_stories
            if story_id in registry.world_stories
        )
        references.extend(
            EntityReference(id=link.world_story_id, entity_type="world_story")
            for link in entity.world_story_threads
            if link.world_story_id in registry.world_stories
            and link.world_story_id not in {reference.id for reference in references}
        )
        references.extend(
            EntityReference(id=campaign_id, entity_type="campaign")
            for campaign_id in entity.campaigns
            if campaign_id in registry.campaigns
        )
        return references

    if entity_type == "world_story":
        references = [
            EntityReference(id=campaign_id, entity_type="campaign")
            for campaign_id in entity.campaigns
            if campaign_id in registry.campaigns
        ]
        references.extend(
            EntityReference(id=campaign_id, entity_type="campaign")
            for campaign_id in (contribution.campaign_id for contribution in entity.contributions)
            if campaign_id in registry.campaigns
        )
        references.extend(
            EntityReference(id=campaign_id, entity_type="campaign")
            for campaign_id in (campaign_id for thread in entity.threads for campaign_id in thread.campaigns)
            if campaign_id in registry.campaigns
        )
        references.extend(
            EntityReference(id=event_id, entity_type="world_event")
            for event_id in entity.world_events
            if event_id in registry.world_events
        )
        references.extend(
            EntityReference(id=event.id, entity_type="world_event")
            for event in registry.world_events.values()
            if (
                entity_id in event.world_stories
                or any(link.world_story_id == entity_id for link in event.world_story_threads)
            )
            and event.id not in {reference.id for reference in references}
        )
        for campaign in registry.campaigns.values():
            if not isinstance(campaign.story, CampaignStory):
                continue
            tagged = any(
                entity_id in beat.world_stories
                or any(link.world_story_id == entity_id for link in beat.world_story_threads)
                or any(
                    entity_id in consequence.world_stories
                    or any(link.world_story_id == entity_id for link in consequence.world_story_threads)
                    for consequence in beat.consequences
                )
                for beat in campaign.story.beats
            ) or any(
                entity_id in action.world_stories
                or any(link.world_story_id == entity_id for link in action.world_story_threads)
                for action in campaign.story.player_actions
            )
            if tagged:
                references.append(EntityReference(id=campaign.id, entity_type="campaign"))
        references.extend(
            EntityReference(id=event.id, entity_type="timeline_event")
            for event in registry.timeline_events.values()
            if entity_id in event.world_stories
            or any(link.world_story_id == entity_id for link in event.world_story_threads)
        )
        return list({(reference.id, reference.entity_type): reference for reference in references}.values())

    return []


def get_campaign_related_entities(
    registry: WorldRegistry,
    campaign_id: str,
) -> list[EntityReference]:
    """Return event and lore records associated with a campaign."""
    if campaign_id not in registry.campaigns:
        return []

    references = [
        EntityReference(id=event.id, entity_type="world_event")
        for event in registry.world_events.values()
        if campaign_id in event.campaigns
    ]
    references.extend(
        EntityReference(id=event.id, entity_type="timeline_event")
        for event in registry.timeline_events.values()
        if campaign_id in event.campaigns
    )
    references.extend(
        EntityReference(id=lore.id, entity_type="lore")
        for lore in registry.lores.values()
        if campaign_id in lore.campaigns
    )
    references.extend(
        EntityReference(id=story.id, entity_type="world_story")
        for story in registry.world_stories.values()
        if campaign_id in story.campaigns
        or any(
            contribution.campaign_id == campaign_id
            for contribution in story.contributions
        )
    )
    campaign = registry.campaigns[campaign_id]
    if isinstance(campaign.story, CampaignStory):
        linked_story_ids = {
            story_id
            for beat in campaign.story.beats
            for story_id in beat.world_stories
        }
        linked_story_ids.update(
            story_id
            for action in campaign.story.player_actions
            for story_id in action.world_stories
        )
        linked_story_ids.update(
            link.world_story_id
            for beat in campaign.story.beats
            for link in beat.world_story_threads
        )
        linked_story_ids.update(
            link.world_story_id
            for beat in campaign.story.beats
            for consequence in beat.consequences
            for link in consequence.world_story_threads
        )
        linked_story_ids.update(
            link.world_story_id
            for action in campaign.story.player_actions
            for link in action.world_story_threads
        )
        linked_story_ids.update(
            link.world_story_id
            for event in registry.world_events.values()
            if campaign_id in event.campaigns
            for link in event.world_story_threads
        )
        linked_story_ids.update(
            story_id
            for event in registry.timeline_events.values()
            if campaign_id in event.campaigns
            for story_id in event.world_stories
        )
        linked_story_ids.update(
            story_id
            for beat in campaign.story.beats
            for consequence in beat.consequences
            for story_id in consequence.world_stories
        )
        existing_ids = {reference.id for reference in references}
        references.extend(
            EntityReference(id=story_id, entity_type="world_story")
            for story_id in linked_story_ids
            if story_id not in existing_ids and story_id in registry.world_stories
        )
    event_story_ids = {
        story_id
        for event in registry.world_events.values()
        if campaign_id in event.campaigns
        for story_id in event.world_stories
    }
    event_story_ids.update(
        link.world_story_id
        for event in registry.world_events.values()
        if campaign_id in event.campaigns
        for link in event.world_story_threads
    )
    event_story_ids.update(
        story_id
        for event in registry.timeline_events.values()
        if campaign_id in event.campaigns
        for story_id in event.world_stories
    )
    event_story_ids.update(
        link.world_story_id
        for event in registry.timeline_events.values()
        if campaign_id in event.campaigns
        for link in event.world_story_threads
    )
    existing_ids = {reference.id for reference in references}
    references.extend(
        EntityReference(id=story_id, entity_type="world_story")
        for story_id in event_story_ids
        if story_id not in existing_ids and story_id in registry.world_stories
    )
    return sorted(references, key=lambda reference: (reference.entity_type, reference.id))
