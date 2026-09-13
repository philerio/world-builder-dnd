from worldbuilder.models.campaign import Campaign
from worldbuilder.models.city import City
from worldbuilder.models.kingdom import Kingdom
from worldbuilder.models.lore import Lore
from worldbuilder.models.npc import NPC
from worldbuilder.models.region import Region
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.models.world_event import WorldEvent


ENTITY_DIRECTORIES: dict[type, str] = {
    Campaign: "campaigns",
    City: "cities",
    Kingdom: "kingdoms",
    Lore: "lore",
    NPC: "npcs",
    Region: "regions",
    TimelineEvent: "timeline",
    WorldEvent: "events",
}
