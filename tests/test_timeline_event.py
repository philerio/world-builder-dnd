from worldbuilder.models.timeline_event import TimelineEvent


def test_timeline_event_defaults():
    event = TimelineEvent(
        id="test-event",
        name="Test Event",
    )

    assert event.era is None
    assert event.date is None
    assert event.locations == []
    assert event.kingdoms == []
    assert event.characters == []
    assert event.campaigns == []
    assert event.consequences == []
    assert event.dm_notes is None