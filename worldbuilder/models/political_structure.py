from uuid import uuid4

from pydantic import BaseModel, Field


class PoliticalOfficeReference(BaseModel):
    """A link to an office held by another political entity."""

    entity_id: str
    office_id: str


class PoliticalOffice(BaseModel):
    """An office or governing body within a kingdom or city."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    holders: list[str] = Field(default_factory=list)
    reports_to: list[PoliticalOfficeReference] = Field(default_factory=list)
    authority: str | None = None
    status: str | None = None
    notes: str | None = None
