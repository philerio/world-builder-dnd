from pydantic import Field

from worldbuilder.models.base import WorldObject
from worldbuilder.models.map_marker import MapMarker

class Map(WorldObject):
    """A map representing a geographic or navigational area."""

    map_type: str | None = None
    parent_map: str | None = None
    image_path: str | None = None
    details: str | None = None
    dm_notes: str | None = None
    markers: list[MapMarker] = Field(default_factory=list)