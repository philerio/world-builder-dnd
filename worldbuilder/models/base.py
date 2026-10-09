from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class WorldObject(BaseModel):
    id: str
    name: str
    description: str | None = None
    tags: list[str] = Field(default_factory=list)

    @field_validator("tags", mode="before")
    @classmethod
    def normalize_tags(cls, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            value = [value]
        if not isinstance(value, list):
            raise ValueError("Tags must be a list of strings.")

        tags: list[str] = []
        seen: set[str] = set()
        for item in value:
            if not isinstance(item, str):
                continue
            tag = item.strip()
            normalized = tag.casefold()
            if tag and normalized not in seen:
                tags.append(tag)
                seen.add(normalized)
        return tags

    created: datetime = Field(default_factory=datetime.utcnow)
    updated: datetime = Field(default_factory=datetime.utcnow)
