from pydantic import BaseModel


class CharacterRelationship(BaseModel):
    character: str
    relationship: str
    notes: str | None = None
