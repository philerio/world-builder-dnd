"""Optional encounter preparation and reviewed combat exchange, version 1."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, StrictInt, model_validator

Allegiance = Literal["party", "ally", "enemy"]
Ability = Literal["Strength", "Dexterity", "Constitution", "Intelligence", "Wisdom", "Charisma"]


class CombatStats(BaseModel):
    model_config = ConfigDict(extra="forbid")
    race: str | None = None
    class_name: str | None = None
    level: int | None = Field(default=None, ge=1, strict=True)
    hp: int | None = Field(default=None, ge=0, strict=True)
    ac: int | None = Field(default=None, ge=0, strict=True)
    abilities: dict[Ability, StrictInt] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_scores(self):
        if any(type(value) is not int or value < 0 for value in self.abilities.values()):
            raise ValueError("Ability scores must be nonnegative whole numbers.")
        return self


class CombatParticipant(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    entity_id: str | None = None
    name: str | None = None
    allegiance: Allegiance = "enemy"
    quantity: int = Field(default=1, ge=1, le=100, strict=True)
    stats: CombatStats | None = None

    @model_validator(mode="after")
    def validate_identity(self):
        if not (self.entity_id or (self.name and self.name.strip())):
            raise ValueError("Choose a world character or enter a combatant name.")
        if self.allegiance == "party" and self.quantity != 1:
            raise ValueError("A linked party member has one combat token.")
        return self


class CombatEncounter(BaseModel):
    id: str = Field(min_length=1, max_length=200)
    name: str = Field(min_length=1, max_length=100)
    map_id: str | None = None
    location_id: str | None = None
    notes: str | None = Field(default=None, max_length=10000)
    participants: list[CombatParticipant] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def validate_roster(self):
        ids = [participant.id for participant in self.participants]
        if len(ids) != len(set(ids)):
            raise ValueError("Encounter participant IDs must be unique.")
        if sum(participant.quantity for participant in self.participants) > 100:
            raise ValueError("An encounter supports up to 100 combatants.")
        return self


class CombatOutcome(BaseModel):
    local_id: str = Field(min_length=1, max_length=200)
    entity_id: str | None = None
    name: str
    allegiance: Allegiance
    health: float = Field(ge=0)
    max_hp: float = Field(ge=0)
    outcome: str | None = Field(default=None, max_length=500)


class CombatResult(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    version: Literal[1]
    reviewed: Literal[True]
    id: str = Field(min_length=1, max_length=200)
    world_id: str = Field(min_length=1)
    campaign_id: str = Field(min_length=1)
    story_beat: str | None = None
    encounter_id: str | None = None
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=10000)
    session: int | None = Field(default=None, ge=1, strict=True)
    rounds: int = Field(ge=0, strict=True)
    participants: list[CombatOutcome] = Field(default_factory=list, max_length=1000)
