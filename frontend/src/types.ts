export type World = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  version: string;
  author: string;
  continents: string[];
};

export type DMScratchpadEntry = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  content: string;
  status: "inbox" | "developing" | "promoted" | "archived";
  promoted_entity_id?: string;
  promoted_subentity_id?: string;
  promoted_as?: string;
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
  tags?: string[];
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
  tags?: string[];
  ruler?: string;
  capital?: string;
  continent?: string;
};

export type Region = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  kingdom?: string;
  continent?: string;
};

export type City = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  kingdom?: string;
  region?: string;
  population?: number;
  details?: string;
  dm_notes?: string;
};

export type Location = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  location_type?: string;
  continent?: string;
  kingdom?: string;
  region?: string;
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
  tags?: string[];
  race?: string;
  alignment?: string;
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
  tags?: string[];
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
  tags?: string[];
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
  tags?: string[];
  era?: string;
  date?: string;
  date_start?: string;
  date_end?: string;
  date_precision?: "exact" | "year" | "approximate" | "range" | "unknown";
  chronology_order?: number;
  locations: string[];
  kingdoms: string[];
  characters: string[];
  campaigns: string[];
  world_stories: string[];
  world_story_threads: WorldStoryThreadLink[];
  source_world_event_id?: string;
  event_links?: TimelineEventLink[];
  campaign_sources?: TimelineCampaignSource[];
  consequences: string[];
  dm_notes?: string;
};

export type TimelineEventLink = {
  event_id: string;
  relationship: "caused_by" | "leads_to" | "related_to";
};

export type TimelineCampaignSource = {
  campaign_id: string;
  session?: number;
  plot_point_ids: string[];
  plot_point_names: string[];
  consequence_ids: string[];
  consequence_descriptions: string[];
  player_action_ids: string[];
  player_action_descriptions: string[];
};

export type Artifact = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  details?: string;
  dm_notes?: string;
};

export type MapMarker = {
  id: string;
  entity_id: string | null;
  layer_id?: string | null;
  z_index?: number;
  type?: "point" | "area" | "path";
  x: number;
  y: number;
  points?: [number, number][];
  label?: string;
  icon?: string;
  icon_image?: string;
  icon_size?: number;
  rotation?: number;
  mirror_x?: boolean;
  mirror_y?: boolean;
  linked_map?: string;
  visible: boolean;
  dm_only: boolean;
  tooltip?: string;
  hide_label?: boolean;
  fill_color?: string;
  fill_opacity?: number;
};

export type MapLayer = {
  id: string;
  name: string;
};

export type Map = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  map_type?: string;
  parent_map?: string;
  entity_id?: string;
  image_path?: string;
  canvas_width?: number;
  canvas_height?: number;
  details?: string;
  dm_notes?: string;
  markers: MapMarker[];
  layers?: MapLayer[];
};

export type Lore = {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  common_knowledge?: string;
  common_knowledge_locations?: string[];
  details?: string;
  player_knowledge?: string;
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
  locations?: Location[];

  npcs: NPC[];
  player_characters: PlayerCharacter[];

  campaigns: Campaign[];

  world_events: WorldEvent[];
  timeline_events: TimelineEvent[];

  lores: Lore[];
  artifacts: Artifact[];

  maps: Map[];
  world_stories: WorldStory[];
  dm_scratchpad_entries?: DMScratchpadEntry[];
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
  tags?: string[];
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
  { value: "dm_scratchpad_entry", label: "DM Scratchpad Entry" },
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
  | "tagArray"
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
  referenceTypes?: string[];
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

export type StoryBeatCheck = {
  id: string;
  name: string;
  category: "notice" | "approach" | "obstacle";
  description?: string;
  roll_type: "skill_check" | "ability_check" | "saving_throw" | "passive" | "contested";
  ability?: "strength" | "dexterity" | "constitution" | "intelligence" | "wisdom" | "charisma";
  skill?: string;
  dc?: number;
  success?: string;
  failure?: string;
};

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

  // DM-facing checks and outcomes for possible notices, approaches, or obstacles
  checks?: StoryBeatCheck[];

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

export type SessionRecap = {
  session: number;
  played_on?: string;
  summary?: string;
  notes?: string;
  timeline_event_id?: string;
};

export type SessionPrep = {
  session: number;
  agenda?: string;
  dm_notes?: string;
  plot_point_ids: string[];
  reference_ids: string[];
};

export type CampaignStory = {
  beats: StoryBeat[];
  current_beat?: string;
  player_actions: PlayerAction[];
  session_recaps?: SessionRecap[];
  session_preps?: SessionPrep[];
  world_clocks: WorldClock[];
};
