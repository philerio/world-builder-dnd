from .base import WorldObject


class Kingdom(WorldObject):
    """A kingdom or sovereign political entity."""

    ruler: str | None = None
    capital: str | None = None
    continent: str | None = None