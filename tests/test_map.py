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


def test_area_marker_can_mask_a_region_in_player_view() -> None:
    marker = MapMarker(
        id="unrevealed-room",
        type="area",
        x=10,
        y=10,
        points=[(10, 10), (30, 10), (30, 30), (10, 30)],
        player_view_mask=True,
    )

    assert marker.player_view_mask is True
    assert Map(id="dungeon", name="Dungeon", markers=[marker]).markers[0].player_view_mask


def test_map_can_enable_fog_with_saved_reveal_areas() -> None:
    reveal = MapMarker(
        id="revealed-room",
        type="area",
        x=10,
        y=10,
        points=[(10, 10), (30, 10), (30, 30), (10, 30)],
        fog_reveal=True,
    )
    dungeon = Map(
        id="dungeon",
        name="Dungeon",
        image_path="/maps/dungeon.png",
        fog_of_war={"enabled": True, "color": "#17191f"},
        markers=[reveal],
    )

    assert dungeon.fog_of_war.enabled is True
    assert dungeon.fog_of_war.color == "#17191f"
    assert dungeon.markers[0].fog_reveal is True
