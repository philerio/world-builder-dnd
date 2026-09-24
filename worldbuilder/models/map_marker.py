from pydantic import BaseModel, Field


class MapMarker(BaseModel):
    """A clickable marker placed on a map."""

    id: str
    entity_id: str | None = None
    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)
    label: str | None = None
    linked_map: str | None = None
    visible: bool = True
    dm_only: bool = False
    tooltip: str | None = None
    hide_label: bool = False
    icon: str | None = None