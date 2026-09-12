from worldbuilder.models.city import City
from worldbuilder.models.world import World
from worldbuilder.models.kingdom import Kingdom
from worldbuilder.models.region import Region

class WorldRegistry:
    """Registry of all loaded world entities."""

    def __init__(self) -> None:
        self.worlds: dict[str, World] = {}
        self.cities: dict[str, City] = {}
        self.kingdoms: dict[str, Kingdom] = {}
        self.regions: dict[str, Region] = {}
        
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