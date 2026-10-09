from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .base import WorldObject
from .story import WorldStoryThreadLink


class TimelineEventLink(BaseModel):
    """A directed or associated relationship between two recorded events."""

    event_id: str
    relationship: Literal["caused_by", "leads_to", "related_to"]


class TimelineCampaignSource(BaseModel):
    """Campaign records that informed a timeline entry."""

    campaign_id: str
    session: int | None = None
    plot_point_ids: list[str] = Field(default_factory=list)
    plot_point_names: list[str] = Field(default_factory=list)
    consequence_ids: list[str] = Field(default_factory=list)
    consequence_descriptions: list[str] = Field(default_factory=list)
    player_action_ids: list[str] = Field(default_factory=list)
    player_action_descriptions: list[str] = Field(default_factory=list)


class TimelineEvent(WorldObject):
    """A significant event in the history of the world."""

    era: str | None = None
    date: str | None = None
    date_start: str | None = None
    date_end: str | None = None
    date_precision: Literal["exact", "year", "approximate", "range", "unknown"] = "unknown"
    chronology_order: int | None = None
    locations: list[str] = Field(default_factory=list)
    kingdoms: list[str] = Field(default_factory=list)
    characters: list[str] = Field(default_factory=list)
    campaigns: list[str] = Field(default_factory=list)
    world_stories: list[str] = Field(default_factory=list)
    world_story_threads: list[WorldStoryThreadLink] = Field(default_factory=list)
    source_world_event_id: str | None = None
    event_links: list[TimelineEventLink] = Field(default_factory=list)
    campaign_sources: list[TimelineCampaignSource] = Field(default_factory=list)
    consequences: list[str] = Field(default_factory=list)
    dm_notes: str | None = None

    @field_validator("date_start", "date_end")
    @classmethod
    def validate_sortable_date(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip()
        parts = value.removeprefix("-").split("-")
        if len(parts) not in {1, 3} or not parts[0].isdigit():
            raise ValueError("Use a year (for example, -1200) or a date (YYYY-MM-DD).")
        if len(parts[0]) > 6:
            raise ValueError("The year must contain no more than six digits.")
        if len(parts) == 3:
            month, day = parts[1:]
            if not (month.isdigit() and day.isdigit() and 1 <= int(month) <= 12):
                raise ValueError("Date month and day must be valid numeric values.")
            year = int(parts[0]) * (-1 if value.startswith("-") else 1)
            month_days = [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
            if not 1 <= int(day) <= month_days[int(month) - 1]:
                raise ValueError("Date month and day must be valid numeric values.")
        return value

    @model_validator(mode="after")
    def validate_date_range(self) -> "TimelineEvent":
        if self.date_precision == "exact" and (
            not self.date_start or len(self.date_start.removeprefix("-").split("-")) != 3
        ):
            raise ValueError("An exact date needs a complete YYYY-MM-DD value.")
        if self.date_precision == "year" and (
            not self.date_start or len(self.date_start.removeprefix("-").split("-")) != 1
        ):
            raise ValueError("Year precision needs a year without month or day.")
        if self.date_precision == "range" and (not self.date_start or not self.date_end):
            raise ValueError("A date range needs both a start and an end date or year.")
        if self.date_start and self.date_end:
            def date_key(value: str) -> tuple[int, int, int]:
                parts = value.removeprefix("-").split("-")
                year = int(parts[0]) * (-1 if value.startswith("-") else 1)
                return (year, int(parts[1]) if len(parts) == 3 else 1, int(parts[2]) if len(parts) == 3 else 1)

            if date_key(self.date_start) > date_key(self.date_end):
                raise ValueError("The date range end must not be earlier than its start.")
        return self
