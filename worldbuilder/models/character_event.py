from pydantic import BaseModel

class CharacterEvent(BaseModel):
    description: str
    campaign: str | None = None
    location: str | None = None