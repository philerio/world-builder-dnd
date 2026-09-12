from pathlib import Path

from worldbuilder.loaders.world_loader import load_world_registry
from worldbuilder.validation.validator import validate_registry


def test_valid_registry() -> None:
    """A correctly loaded registry should pass validation."""
    registry = load_world_registry(
        Path("worlds/elligaesia/world.yaml")
    )

    result = validate_registry(registry)

    assert result.is_valid
    assert result.errors == []


def test_validation_result_starts_valid() -> None:
    """A new validation result has no errors."""
    from worldbuilder.validation.validator import ValidationResult

    result = ValidationResult()

    assert result.is_valid
    assert result.errors == []


def test_validation_result_can_record_error() -> None:
    """Validation errors make the result invalid."""
    from worldbuilder.validation.validator import ValidationResult

    result = ValidationResult()

    result.add_error("Something went wrong.")

    assert not result.is_valid
    assert result.errors == ["Something went wrong."]

def test_valid_reference() -> None:
    """An existing ID should pass reference validation."""
    from worldbuilder.validation.validator import ValidationResult, validate_reference

    result = ValidationResult()
    collection = {
        "reqrun": object(),
    }

    validate_reference(
        result,
        collection,
        "reqrun",
        "city",
    )

    assert result.is_valid
    assert result.errors == []


def test_unknown_reference() -> None:
    """A missing ID should produce a validation error."""
    from worldbuilder.validation.validator import ValidationResult, validate_reference

    result = ValidationResult()
    collection = {
        "reqrun": object(),
    }

    validate_reference(
        result,
        collection,
        "requrn",
        "city",
    )

    assert not result.is_valid
    assert result.errors == [
        "Unknown city ID: requrn"
    ]