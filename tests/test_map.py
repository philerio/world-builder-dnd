from worldbuilder.models.map import Map
from worldbuilder.models.map_marker import MapMarker


def test_map_supports_markers() -> None:
    world_map = Map(
        id="test-map",
        name="Test Map",
        map_type="world",
        markers=[
            MapMarker(
                id="test-city-marker",
                entity_id="test-city",
                x=42.5,
                y=67.2,
                label="Test City",
            )
        ],
    )

    assert len(world_map.markers) == 1
    assert world_map.markers[0].entity_id == "test-city"
    assert world_map.markers[0].x == 42.5
    assert world_map.markers[0].y == 67.2