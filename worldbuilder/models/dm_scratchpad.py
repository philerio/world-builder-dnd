from typing import Literal

from .base import WorldObject


class DmScratchpadEntry(WorldObject):
    """A freeform DM idea that can later be promoted into a world entity."""

    content: str = ""
    status: Literal["inbox", "developing", "promoted", "archived"] = "inbox"
    promoted_entity_id: str | None = None
    promoted_subentity_id: str | None = None
    promoted_as: str | None = None
