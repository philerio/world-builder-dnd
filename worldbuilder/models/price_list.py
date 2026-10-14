from pydantic import BaseModel, Field

from worldbuilder.models.base import WorldObject


class PriceListItem(BaseModel):
    id: str
    name: str
    category: str = "Other"
    price_copper: int = Field(ge=0)
    notes: str | None = None


class PriceList(WorldObject):
    """Editable reference prices for goods and optional item price guidance."""

    items: list[PriceListItem] = Field(default_factory=list)
