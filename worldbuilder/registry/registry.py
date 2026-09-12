from worldbuilder.models.city import City
from worldbuilder.models.timeline_event import TimelineEvent
from worldbuilder.models.world import World
from worldbuilder.models.kingdom import Kingdom
from worldbuilder.models.region import Region
from worldbuilder.models.npc import NPC
from worldbuilder.models.campaign import Campaign
from worldbuilder.models.world_event import WorldEvent
from worldbuilder.models.lore import Lore

class WorldRegistry:
    """Registry of all loaded world entities."""

    def __init__(self) -> None:
        self.worlds: dict[str, World] = {}
        self.cities: dict[str, City] = {}
        self.kingdoms: dict[str, Kingdom] = {}
        self.regions: dict[str, Region] = {}
        self.npcs: dict[str, NPC] = {}
        self.campaigns: dict[str, Campaign] = {}
        self.world_events: dict[str, WorldEvent] = {}
        self.timeline_events: dict[str, TimelineEvent] = {}
        self.lores: dict[str, Lore] = {}

    def add_world(self, world: World) -> None:
        """Add a world to the registry."""
        if world.id in self.worlds:
            raise ValueError(f"Duplicate world ID: {world.id}")

        self.worlds[world.id] = world

    def get_world(self, world_id: str) -> World | None:
        """Get a world by ID."""
        return self.worlds.get(world_id)

    def has_world(self, world_id: str) -> bool:
        """Check whether a world exists."""
        return world_id in self.worlds

    def add_city(self, city: City) -> None:
        """Add a city to the registry."""
        if city.id in self.cities:
            raise ValueError(f"Duplicate city ID: {city.id}")

        self.cities[city.id] = city

    def get_city(self, city_id: str) -> City | None:
        """Get a city by ID."""
        return self.cities.get(city_id)

    def has_city(self, city_id: str) -> bool:
        """Check whether a city exists."""
        return city_id in self.cities

    def add_kingdom(self, kingdom: Kingdom) -> None:
        """Add a kingdom to the registry."""
        if kingdom.id in self.kingdoms:
            raise ValueError(f"Duplicate kingdom ID: {kingdom.id}")

        self.kingdoms[kingdom.id] = kingdom


    def get_kingdom(self, kingdom_id: str) -> Kingdom | None:
        """Get a kingdom by ID."""
        return self.kingdoms.get(kingdom_id)


    def has_kingdom(self, kingdom_id: str) -> bool:
        """Check whether a kingdom exists."""
        return kingdom_id in self.kingdoms
    
    def add_region(self, region: Region) -> None:
        """Add a region to the registry."""
        if region.id in self.regions:
            raise ValueError(f"Duplicate region ID: {region.id}")

        self.regions[region.id] = region


    def get_region(self, region_id: str) -> Region | None:
        """Get a region by ID."""
        return self.regions.get(region_id)


    def has_region(self, region_id: str) -> bool:
        """Check whether a region exists."""
        return region_id in self.regions

    def add_npc(self, npc: NPC) -> None:
        """Add an NPC to the registry."""
        if npc.id in self.npcs:
            raise ValueError(f"Duplicate NPC ID: {npc.id}")

        self.npcs[npc.id] = npc


    def get_npc(self, npc_id: str) -> NPC | None:
        """Get an NPC by ID."""
        return self.npcs.get(npc_id)


    def has_npc(self, npc_id: str) -> bool:
        """Check whether an NPC exists."""
        return npc_id in self.npcs
    
    def add_campaign(self, campaign: Campaign) -> None:
        """Add a campaign to the registry."""
        if campaign.id in self.campaigns:
            raise ValueError(f"Duplicate campaign ID: {campaign.id}")

        self.campaigns[campaign.id] = campaign


    def get_campaign(self, campaign_id: str) -> Campaign | None:
        """Get a campaign by ID."""
        return self.campaigns.get(campaign_id)


    def has_campaign(self, campaign_id: str) -> bool:
        """Check whether a campaign exists."""
        return campaign_id in self.campaigns

    def add_world_event(self, event: WorldEvent) -> None:
        if event.id in self.world_events:
            raise ValueError(f"Duplicate world event ID: {event.id}")
        self.world_events[event.id] = event
        
    def get_world_event(self, event_id: str) -> WorldEvent | None:
        return self.world_events.get(event_id)
    
    def add_timeline_event(self, event: TimelineEvent) -> None:
        if event.id in self.timeline_events:
            raise ValueError(f"Duplicate timeline event ID: {event.id}")
        self.timeline_events[event.id] = event


    def get_timeline_event(self, event_id: str) -> TimelineEvent | None:
        return self.timeline_events.get(event_id)


    def has_timeline_event(self, event_id: str) -> bool:
        return event_id in self.timeline_events
    
    def add_lore(self, lore: Lore) -> None:
        """Add a lore entry to the registry."""
        if lore.id in self.lores:
            raise ValueError(f"Duplicate lore ID: {lore.id}")

        self.lores[lore.id] = lore

    def get_lore(self, lore_id: str) -> Lore | None:
        """Get a lore entry by ID."""
        return self.lores.get(lore_id)

    def has_lore(self, lore_id: str) -> bool:
        """Check whether a lore entry exists."""
        return lore_id in self.lores