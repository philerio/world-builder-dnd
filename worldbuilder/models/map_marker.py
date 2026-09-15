from pydantic import BaseModel, Field


class MapMarker(BaseModel):
    """A clickable marker placed on a map."""

    id: str
    entity_id: str
    x: float = Field(ge=0, le=100)
    y: float = Field(ge=0, le=100)
    label: str | None = None
    visible: bool = True
    dm_only: bool = False