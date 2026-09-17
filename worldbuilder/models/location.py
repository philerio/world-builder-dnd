from pydantic import Field

from worldbuilder.models.base import WorldObject


class Location(WorldObject):
    location_type: str | None = None
    continent: str | None = None
    kingdom: str | None = None
    region: str | None = None
    details: str | None = None
    dm_notes: str | None = None