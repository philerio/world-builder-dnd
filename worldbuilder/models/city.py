from .base import WorldObject


class City(WorldObject):
    """A city or settlement in the world."""

    kingdom: str | None = None
    region: str | None = None
    population: int | None = None