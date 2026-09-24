from worldbuilder.models.artifact import Artifact
from worldbuilder.models.campaign import Campaign
from worldbuilder.models.city import City
from worldbuilder.models.continent import Continent
from worldbuilder.models.kingdom import Kingdom
from worldbuilder.models.lore import Lore
from worldbuilder.models.map import Map
from worldbuilder.models.location import Location
from worldbuilder.models.npc import NPC
from worldbuilder.models.player_character import PlayerCharacter
from worldbuilder.models.region import Region
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.models.world_event import WorldEvent

ENTITY_DIRECTORIES: dict[type, str] = {
    Artifact: "artifacts",
    Campaign: "campaigns",
    City: "cities",
    Continent: "continents",
    Kingdom: "kingdoms",
    Lore: "lore",
    Map: "maps",
    Location: "locations",
    NPC: "npcs",
    PlayerCharacter: "player_characters",
    Region: "regions",
    TimelineEvent: "timeline",
    WorldEvent: "events",
}
