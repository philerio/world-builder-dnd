from .base import WorldObject


class City(WorldObject):
    """A city or settlement within the world."""

    kingdom: str | None = None
    region: str | None = None
    population: int | None = None
    details: str | None = None
    dm_notes: str | None = None
