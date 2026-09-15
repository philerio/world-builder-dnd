from worldbuilder.models.base import WorldObject


class Artifact(WorldObject):
    """A significant magical, technological, or otherwise unique object."""
    details: str | None = None
    dm_notes: str | None = None