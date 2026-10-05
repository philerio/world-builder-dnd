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
  // existing fields...

  id: string;
  name: string;
  description?: string;
  created?: string;
  updated?: string;

  overview?: string;
  status?: string;

  locations?: string[];
  npcs?: string[];
  player_characters?: string[];

  outcome?: string;
  consequences?: string;

  // NEW
  story?: CampaignStory | { nodes: unknown[] };
};

export type WorldEvent = {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status?: string;
  locations: string[];
  characters: string[];
  campaigns: string[];
  world_stories: string[];
  world_story_threads: WorldStoryThreadLink[];
  story_sources: CampaignStorySource[];
  timeline_event_id?: string;
  caused_by: string[];
  true_causes: string[];
  hidden_connections: string[];
  dm_notes?: string;
  consequences: string[];
  potential_campaign: boolean;
};

export type CampaignStorySource = {
  campaign_id: string;
  plot_point_id?: string;
  plot_point_name?: string;
  consequence_ids: string[];
  consequence_descriptions: string[];
  player_action_ids: string[];
  player_action_descriptions: string[];
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
  world_stories: string[];
  world_story_threads: WorldStoryThreadLink[];
  source_world_event_id?: string;
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
  type?: "point" | "area" | "path";
  x: number;
  y: number;
  points?: [number, number][];
  label?: string;
  icon?: string;
  linked_map?: string;
  visible: boolean;
  dm_only: boolean;
  tooltip?: string;
  hide_label?: boolean;
  fill_color?: string;
  fill_opacity?: number;
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
  campaigns?: string[];
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
  world_stories: WorldStory[];
};

export type WorldStoryContribution = {
  campaign_id: string;
  source_type: "campaign_outcome" | "plot_point" | "consequence" | "player_action";
  source_id?: string;
  summary: string;
  connection_status: "proposed" | "confirmed" | "rejected";
  dm_notes?: string;
  thread_ids?: string[];
};

export type WorldStoryThreadLink = {
  world_story_id: string;
  thread_id: string;
};

export type WorldStoryThread = {
  id: string;
  name: string;
  description?: string;
  status: string;
  campaigns: string[];
  world_events: string[];
};

export type WorldStory = {
  id: string;
  name: string;
  description?: string;
  overview?: string;
  status: string;
  characters: string[];
  campaigns: string[];
  world_events: string[];
  world_clocks: WorldClock[];
  threads: WorldStoryThread[];
  contributions: WorldStoryContribution[];
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
  { value: "world_story", label: "World Story" },
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
export type EntityFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "reference"
  | "referenceArray"
  | "array"
  | "objectArray"
  | "autocomplete"
  | "color"
  | "icon";

export type OptionsDefinition = {
  value: string;
  label: string;
};
export type EntityFieldDefinition = {
  name: string;
  label: string;
  type: EntityFieldType;
  referenceType?: string;
  fields?: EntityFieldDefinition[];
  generated?: boolean;
  accordion?: boolean;
  accordionTitleField?: string;
  options?: OptionsDefinition[];
  hidden?: boolean;
};
export type DrawingState = {
  markerId: string;
  type: "area" | "path";
  points: [number, number][];
  editing: boolean;
};
export type StoryBeatStatus =
  | "planned"
  | "available"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped"
  | "changed";

export type StoryContentNode =
  | { type: "text"; text: string }
  | { type: "entity_link"; text: string; entity_id: string };

export type StoryContent = { nodes: StoryContentNode[] };

export type StoryBeat = {
  id: string;
  name: string;
  description?: string;
  description_content?: StoryContent;
  events_content?: StoryContent;
  triggers_content?: StoryContent;
  possible_approaches_content?: StoryContent;

  status: StoryBeatStatus;

  act?: string;
  order?: number;

  // What can cause this beat to become relevant
  triggers?: string[];

  // What actually happens when this beat occurs
  events?: string;

  // DM-only information
  secrets?: string[];

  // Things the DM is prepared for the players to do
  possible_approaches?: string[];

  // Other story beats this can lead toward
  leads_to?: string[];

  // Linked world entities
  locations?: string[];
  npcs?: string[];
  player_characters?: string[];

  // Consequences associated with this beat
  consequences?: StoryConsequence[];

  // World events/clocks associated with this beat
  world_events?: string[];
  world_stories?: string[];
  world_story_threads?: WorldStoryThreadLink[];
};

export type PlayerAction = {
  id: string;
  description: string;

  // Optional session this happened during
  session?: number;

  // Optional story beat this action relates to
  story_beat?: string;

  // What the DM believes this action may affect
  consequence_ids?: string[];

  // Larger setting stories this action may affect
  world_stories?: string[];
  world_story_threads?: WorldStoryThreadLink[];
  reviewed?: boolean;

  notes?: string;
};

export type StoryConsequence = {
  id: string;
  description: string;

  // What caused the consequence
  trigger?: string;

  // Optional player action that caused it
  player_action?: string;

  // When/how it should activate
  timing?: string;

  status: "pending" | "active" | "resolved" | "prevented";

  // What story beat or world event it activates
  leads_to?: string[];
  // World stories this consequence may affect
  world_stories?: string[];
  world_story_threads?: WorldStoryThreadLink[];
};

export type WorldClock = {
  id: string;
  name: string;

  description?: string;

  current: number;
  maximum: number;

  // What happens at each step
  stages?: string[];

  // What happens when the clock reaches maximum
  completion?: string;

  status: "active" | "paused" | "completed";
};

export type CampaignStory = {
  beats: StoryBeat[];
  current_beat?: string;
  player_actions: PlayerAction[];
  world_clocks: WorldClock[];
};
