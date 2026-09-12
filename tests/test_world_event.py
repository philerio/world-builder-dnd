from worldbuilder.models.world_event import WorldEvent


def test_world_event_defaults():
    event = WorldEvent(
        id="test-event",
        name="Test Event",
    )

    assert event.type is None
    assert event.status is None
    assert event.locations == []
    assert event.campaigns == []
    assert event.caused_by == []
    assert event.true_causes == []
    assert event.hidden_connections == []
    assert event.dm_notes is None
    assert event.consequences == []
    assert event.potential_campaign is False
