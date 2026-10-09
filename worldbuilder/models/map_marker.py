from typing import Literal

from pydantic import BaseModel, Field


class MapMarker(BaseModel):
    """A clickable marker or geographic overlay placed on a map."""

    id: str
    entity_id: str | None = None
    layer_id: str | None = None
    z_index: int = Field(default=0, ge=0, le=100_000)
    type: Literal["point", "area", "path"] = "point"
    points: list[tuple[float, float]] = Field(default_factory=list)
    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)
    label: str | None = None
    linked_map: str | None = None
    visible: bool = True
    dm_only: bool = False
    tooltip: str | None = None
    hide_label: bool = False
    icon: str | None = None
    icon_image: str | None = None
    icon_size: int = Field(default=72, ge=24, le=256)
    rotation: float = Field(default=0, ge=-360, le=360)
    mirror_x: bool = False
    mirror_y: bool = False
    fill_color: str | None = None
    fill_opacity: float = Field(default=0.2, ge=0, le=1)
