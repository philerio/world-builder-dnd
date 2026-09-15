from worldbuilder.models.map_marker import MapMarker
import pytest
from pydantic import ValidationError



def test_map_marker_model() -> None:
    marker = MapMarker(
        id="test-city-marker",
        entity_id="test-city",
        x=42.5,
        y=67.2,
        label="Test City",
    )

    assert marker.id == "test-city-marker"
    assert marker.entity_id == "test-city"
    assert marker.x == 42.5
    assert marker.y == 67.2
    assert marker.label == "Test City"
    assert marker.visible is True
    assert marker.dm_only is False
    
def test_map_marker_supports_dm_only_visibility() -> None:
    marker = MapMarker(
        id="secret-marker",
        entity_id="test-artifact",
        x=25.0,
        y=75.0,
        label="Secret Location",
        dm_only=True,
    )

    assert marker.dm_only is True
    assert marker.visible is True

def test_map_marker_can_be_hidden() -> None:
    marker = MapMarker(
        id="hidden-marker",
        entity_id="test-artifact",
        x=10.0,
        y=20.0,
        visible=False,
    )

    assert marker.visible is False
    assert marker.dm_only is False

def test_map_marker_coordinates_are_normalized() -> None:
    marker = MapMarker(
        id="test-marker",
        entity_id="test-city",
        x=42.5,
        y=67.2,
    )

    assert marker.x == 42.5
    assert marker.y == 67.2


def test_map_marker_rejects_coordinates_outside_0_to_100() -> None:
    with pytest.raises(ValidationError):
        MapMarker(
            id="test-marker",
            entity_id="test-city",
            x=101,
            y=50,
        )

    with pytest.raises(ValidationError):
        MapMarker(
            id="test-marker",
            entity_id="test-city",
            x=50,
            y=-1,
        )