from pydantic import BaseModel, Field, model_validator

from worldbuilder.models.base import WorldObject
from worldbuilder.models.map_marker import MapMarker


class MapLayer(BaseModel):
    """A user-defined visual/editor group for map markers and shapes."""

    id: str
    name: str = Field(min_length=1, max_length=80)


class Map(WorldObject):
    """A map representing a geographic or navigational area."""

    map_type: str | None = None
    parent_map: str | None = None
    image_path: str | None = None
    canvas_width: int | None = Field(default=None, ge=500, le=10000)
    canvas_height: int | None = Field(default=None, ge=500, le=10000)
    details: str | None = None
    dm_notes: str | None = None
    markers: list[MapMarker] = Field(default_factory=list)
    layers: list[MapLayer] = Field(default_factory=list)
    linked_map: str | None = None
    entity_id: str | None = None
    tooltip: str | None = None

    @model_validator(mode="after")
    def validate_marker_layers(self) -> "Map":
        layer_ids = [layer.id for layer in self.layers]
        if len(layer_ids) != len(set(layer_ids)):
            raise ValueError("Map layer IDs must be unique.")
        normalized_names = [layer.name.strip().casefold() for layer in self.layers]
        if len(normalized_names) != len(set(normalized_names)):
            raise ValueError("Map layer names must be unique.")
        valid_layer_ids = set(layer_ids)
        missing_layer_ids = {
            marker.layer_id
            for marker in self.markers
            if marker.layer_id is not None and marker.layer_id not in valid_layer_ids
        }
        if missing_layer_ids:
            raise ValueError(
                "Markers reference map layers that do not exist: "
                + ", ".join(sorted(missing_layer_ids))
            )
        return self
