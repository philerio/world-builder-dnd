from worldbuilder.models.reference import EntityReference
from worldbuilder.registry import WorldRegistry


def get_related_entities(
    registry: WorldRegistry,
    entity_id: str,
) -> list[EntityReference]:
    entity = registry.get_entity(entity_id)

    if entity is None:
        return []

    entity_type = registry.get_entity_type(entity_id)

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

    return []
