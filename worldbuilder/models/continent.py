from .base import WorldObject


class Continent(WorldObject):
    """A major landmass within the world."""

    details: str | None = None
    dm_notes: str | None = None
