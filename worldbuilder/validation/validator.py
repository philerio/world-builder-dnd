from collections.abc import Mapping

from worldbuilder.models.world import World
from worldbuilder.registry import WorldRegistry


class ValidationResult:
    """Result of validating world data."""

    def __init__(self) -> None:
        self.errors: list[str] = []

    @property
    def is_valid(self) -> bool:
        """Return whether validation passed."""
        return len(self.errors) == 0

    def add_error(self, message: str) -> None:
        """Add a validation error."""
        self.errors.append(message)


def validate_reference(
    result: ValidationResult,
    collection: Mapping[str, object],
    referenced_id: str,
    entity_type: str,
) -> None:
    """Validate that a referenced ID exists."""
    if referenced_id not in collection:
        result.add_error(
            f"Unknown {entity_type} ID: {referenced_id}"
        )


def validate_registry(registry: WorldRegistry) -> ValidationResult:
    """Validate all entities in a world registry."""
    result = ValidationResult()

    for world in registry.worlds.values():
        if not isinstance(world, World):
            result.add_error(
                f"Invalid world object: {world!r}"
            )

    return result