from datetime import datetime

from pydantic import BaseModel, Field


class WorldObject(BaseModel):
    id: str
    name: str
    description: str | None = None

    created: datetime = Field(default_factory=datetime.utcnow)
    updated: datetime = Field(default_factory=datetime.utcnow)