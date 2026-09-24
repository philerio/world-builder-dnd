export type World = {
  id: string;
  name: string;
  description?: string;
  version: string;
  author: string;
  continents: string[];
};
export type EntitySummary = {
  id: string;
  entity_type: string;
  name: string;
};
export type Continent = {
  id: string;
  name: string;
  description?: string;
  details?: string;
  dm_notes?: string;
};
export const REFERENCE_FIELDS: Record<string, string> = {
  kingdom: "kingdom",
  region: "region",
  continent: "continent",
  capital: "city",
  ruler: "npc",
  location: "location",
};
export type Kingdom = {
  id: string;
  name: string;
  description?: string;
  ruler?: string;
  capital?: string;
  continent?: string;
};

export type Region = {
  id: string;
  name: string;
  description?: string;
  kingdom?: string;
  continent?: string;
};

export type City = {
  id: string;
  name: string;
  description?: string;
  kingdom?: string;
  region?: string;
  population?: number;
  details?: string;
  dm_notes?: string;
};

export type CharacterRelationship = {
  character: string;
  relationship: string;
  notes?: string;
};

export type CharacterEvent = {
  description: string;
  campaign?: string;
  location?: string;
};

export type Character = {
  id: string;
  name: string;
  description?: string;
  role?: string;
  city?: string;
  region?: string;
  kingdom?: string;
  details?: string;
  motives: string[];
  goals: string[];
  fears: string[];
  secrets: string[];
  knowledge: string[];
  events: CharacterEvent[];
  relationships: CharacterRelationship[];
};

export type NPC = Character;

export type PlayerCharacter = Character;

export type Campaign = {
  id: string;
  name: string;
  description?: string;
  overview?: string;
  status?: string;
  locations: string[];
  npcs: string[];
  player_characters: string[];
  outcome?: string;
  consequences?: string;
};

export type WorldEvent = {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status?: string;
  locations: string[];
  campaigns: string[];
  caused_by: string[];
  true_causes: string[];
  hidden_connections: string[];
  dm_notes?: string;
  consequences: string[];
  potential_campaign: boolean;
};

export type TimelineEvent = {
  id: string;
  name: string;
  description?: string;
  era?: string;
  date?: string;
  locations: string[];
  kingdoms: string[];
  characters: string[];
  campaigns: string[];
  consequences: string[];
  dm_notes?: string;
};

export type Artifact = {
  id: string;
  name: string;
  description?: string;
  details?: string;
  dm_notes?: string;
};

export type MapMarker = {
  id: string;
  entity_id: string;
  x: number;
  y: number;
  label?: string;
  linked_map?: string;
  visible: boolean;
  dm_only: boolean;
  tooltip?: string;
  hide_label?: boolean;
  icon?: string;
};

export type Map = {
  id: string;
  name: string;
  description?: string;
  map_type?: string;
  parent_map?: string;
  entity_id?: string;
  image_path?: string;
  details?: string;
  dm_notes?: string;
  markers: MapMarker[];
};

export type Lore = {
  id: string;
  name: string;
  description?: string;
  details?: string;
  dm_notes?: string;
};

export type WorldData = {
  world?: World;
  worlds?: World[];

  continents: Continent[];
  kingdoms: Kingdom[];
  regions: Region[];
  cities: City[];

  npcs: NPC[];
  player_characters: PlayerCharacter[];

  campaigns: Campaign[];

  world_events: WorldEvent[];
  timeline_events: TimelineEvent[];

  lores: Lore[];
  artifacts: Artifact[];

  maps: Map[];
};

export type EntityResponse = {
  id: string;
  entity_type: string;
  entity: Record<string, unknown>;
};
export const ENTITY_TYPES = [
  { value: "city", label: "City" },
  { value: "continent", label: "Continent" },
  { value: "kingdom", label: "Kingdom" },
  { value: "region", label: "Region" },
  { value: "location", label: "Location" },
  { value: "npc", label: "NPC" },
  { value: "player_character", label: "Player Character" },
  { value: "campaign", label: "Campaign" },
  { value: "world_event", label: "World Event" },
  { value: "timeline_event", label: "Timeline Event" },
  { value: "lore", label: "Lore" },
  { value: "artifact", label: "Artifact" },
  { value: "map", label: "Map" },
];

export type EntityData = {
  id: string;
  entity_type: string;
  entity: Record<string, unknown>;
};
