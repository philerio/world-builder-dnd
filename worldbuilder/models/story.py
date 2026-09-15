from typing import Literal

from pydantic import BaseModel


class StoryText(BaseModel):
    """A piece of ordinary story text."""

    type: Literal["text"] = "text"
    text: str


class StoryEntityLink(BaseModel):
    """A clickable reference to a world entity."""

    type: Literal["entity_link"] = "entity_link"
    text: str
    entity_id: str


StoryNode = StoryText | StoryEntityLink


class StoryContent(BaseModel):
    """Structured story content made of text and entity links."""

    nodes: list[StoryNode]
