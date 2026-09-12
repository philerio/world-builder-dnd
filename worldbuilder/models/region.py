from .base import WorldObject


class Region(WorldObject):
    """A geographic or political region within a kingdom or continent."""

    kingdom: str | None = None
    continent: str | None = None