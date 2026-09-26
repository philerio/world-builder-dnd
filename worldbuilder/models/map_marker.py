from typing import Literal
from pydantic import BaseModel, Field


class MapMarker(BaseModel):
    """A clickable marker or geographic overlay placed on a map."""

    id: str
    entity_id: str | None = None
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
    fill_color: str | None = None
    fill_opacity: float = Field(default=0.2, ge=0, le=1)
