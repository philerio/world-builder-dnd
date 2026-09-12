from .base import WorldObject


class World(WorldObject):
    version: str

    author: str

    continents: list[str]