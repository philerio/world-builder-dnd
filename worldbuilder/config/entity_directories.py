from worldbuilder.models.artifact import Artifact
from worldbuilder.models.campaign import Campaign
from worldbuilder.models.continent import Continent
from worldbuilder.models.city import City
from worldbuilder.models.kingdom import Kingdom
from worldbuilder.models.lore import Lore
from worldbuilder.models.npc import NPC
from worldbuilder.models.region import Region
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.models.world_event import WorldEvent
from worldbuilder.models.map import Map

ENTITY_DIRECTORIES: dict[type, str] = {
    Artifact: "artifacts",
    Continent: "continents",
    Campaign: "campaigns",
    City: "cities",
    Kingdom: "kingdoms",
    Lore: "lore",
    NPC: "npcs",
    Region: "regions",
    TimelineEvent: "timeline",
    WorldEvent: "events",
    Map: "maps",
}
