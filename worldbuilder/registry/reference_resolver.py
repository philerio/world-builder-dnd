from worldbuilder.models.reference import ResolvedEntity
from worldbuilder.registry import WorldRegistry


def resolve_reference(
    registry: WorldRegistry,
    entity_id: str,
) -> ResolvedEntity | None:
    """Resolve an entity ID into its type and entity."""

    entity = registry.get_entity(entity_id)

    if entity is None:
        return None

    entity_type = registry.get_entity_type(entity_id)

    if entity_type is None:
        return None

    return ResolvedEntity(
        id=entity_id,
        entity_type=entity_type,
        entity=entity,
    )