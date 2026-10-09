import type { EntityFieldDefinition } from "./types";

const COMMON_FIELDS: EntityFieldDefinition[] = [
  {
    name: "name",
    label: "Name",
    type: "text",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
  },
  {
    name: "tags",
    label: "Tags",
    type: "tagArray",
  },
];

const ALIGNMENT_FIELD = {
  name: "alignment",
  label: "Alignment",
  type: "autocomplete" as const,
  options: [
    { value: "Lawful Good", label: "Lawful Good" },
    { value: "Neutral Good", label: "Neutral Good" },
    { value: "Chaotic Good", label: "Chaotic Good" },
    { value: "Lawful Neutral", label: "Lawful Neutral" },
    { value: "True Neutral", label: "True Neutral" },
    { value: "Chaotic Neutral", label: "Chaotic Neutral" },
    { value: "Lawful Evil", label: "Lawful Evil" },
    { value: "Neutral Evil", label: "Neutral Evil" },
    { value: "Chaotic Evil", label: "Chaotic Evil" },
    { value: "Unaligned", label: "Unaligned" },
  ],
};

export const ENTITY_FIELD_DEFINITIONS: Record<string, EntityFieldDefinition[]> =
  {
    city: [
      ...COMMON_FIELDS,
      {
        name: "kingdom",
        label: "Kingdom",
        type: "reference",
        referenceType: "kingdom",
      },
      {
        name: "region",
        label: "Region",
        type: "reference",
        referenceType: "region",
      },
      {
        name: "population",
        label: "Population",
        type: "number",
      },
      {
        name: "details",
        label: "Details",
        type: "textarea",
      },
      {
        name: "dm_notes",
        label: "DM Notes",
        type: "textarea",
      },
    ],

    continent: [
      ...COMMON_FIELDS,
      {
        name: "details",
        label: "Details",
        type: "textarea",
      },
      {
        name: "dm_notes",
        label: "DM Notes",
        type: "textarea",
      },
    ],

    kingdom: [
      ...COMMON_FIELDS,
      {
        name: "continent",
        label: "Continent",
        type: "reference",
        referenceType: "continent",
      },
      {
        name: "ruler",
        label: "Ruler",
        type: "reference",
        referenceType: "npc",
      },
      {
        name: "capital",
        label: "Capital",
        type: "reference",
        referenceType: "city",
      },
    ],

    region: [
      ...COMMON_FIELDS,
      {
        name: "kingdom",
        label: "Kingdom",
        type: "reference",
        referenceType: "kingdom",
      },
      {
        name: "continent",
        label: "Continent",
        type: "reference",
        referenceType: "continent",
      },
    ],

    location: [
      ...COMMON_FIELDS,
      {
        name: "location_type",
        label: "Location Type",
        type: "text",
      },
      {
        name: "continent",
        label: "Continent",
        type: "reference",
        referenceType: "continent",
      },
      {
        name: "kingdom",
        label: "Kingdom",
        type: "reference",
        referenceType: "kingdom",
      },
      {
        name: "region",
        label: "Region",
        type: "reference",
        referenceType: "region",
      },
      {
        name: "details",
        label: "Details",
        type: "textarea",
      },
      {
        name: "dm_notes",
        label: "DM Notes",
        type: "textarea",
      },
    ],

    npc: [
      ...COMMON_FIELDS,
      {
        name: "race",
        label: "Race",
        type: "text",
      },
      ALIGNMENT_FIELD,
      {
        name: "role",
        label: "Role",
        type: "text",
      },
      {
        name: "city",
        label: "City",
        type: "reference",
        referenceType: "city",
      },
      {
        name: "region",
        label: "Region",
        type: "reference",
        referenceType: "region",
      },
      {
        name: "kingdom",
        label: "Kingdom",
        type: "reference",
        referenceType: "kingdom",
      },
      {
        name: "details",
        label: "Details",
        type: "textarea",
      },
      {
        name: "motives",
        label: "Motives",
        type: "array",
      },
      {
        name: "goals",
        label: "Goals",
        type: "array",
      },
      {
        name: "fears",
        label: "Fears",
        type: "array",
      },
      {
        name: "secrets",
        label: "Secrets",
        type: "array",
      },
      {
        name: "knowledge",
        label: "Knowledge",
        type: "array",
      },
      {
        name: "events",
        label: "Events",
        type: "objectArray",
        fields: [
          {
            name: "description",
            label: "Description",
            type: "textarea",
          },
          {
            name: "campaign",
            label: "Campaign",
            type: "reference",
            referenceType: "campaign",
          },
          {
            name: "location",
            label: "Location",
            type: "reference",
            referenceTypes: ["location", "city"],
          },
        ],
      },
      {
        name: "relationships",
        label: "Relationships",
        type: "objectArray",
        fields: [
          {
            name: "character",
            label: "Character",
            type: "reference",
            referenceTypes: ["npc", "player_character"],
          },
          {
            name: "relationship",
            label: "Relationship",
            type: "text",
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
          },
        ],
      },
    ],

    player_character: [
      ...COMMON_FIELDS,
      {
        name: "race",
        label: "Race",
        type: "text",
      },
      ALIGNMENT_FIELD,
      {
        name: "role",
        label: "Role",
        type: "text",
      },
      {
        name: "city",
        label: "City",
        type: "reference",
        referenceType: "city",
      },
      {
        name: "region",
        label: "Region",
        type: "reference",
        referenceType: "region",
      },
      {
        name: "kingdom",
        label: "Kingdom",
        type: "reference",
        referenceType: "kingdom",
      },
      {
        name: "details",
        label: "Details",
        type: "textarea",
      },
      {
        name: "events",
        label: "Events",
        type: "objectArray",
        fields: [
          {
            name: "description",
            label: "Description",
            type: "textarea",
          },
          {
            name: "campaign",
            label: "Campaign",
            type: "reference",
            referenceType: "campaign",
          },
          {
            name: "location",
            label: "Location",
            type: "reference",
            referenceTypes: ["location", "city"],
          },
        ],
      },
      {
        name: "relationships",
        label: "Relationships",
        type: "objectArray",
        fields: [
          {
            name: "character",
            label: "Character",
            type: "reference",
            referenceTypes: ["npc", "player_character"],
          },
          {
            name: "relationship",
            label: "Relationship",
            type: "text",
          },
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
          },
        ],
      },
    ],

    campaign: [
      ...COMMON_FIELDS,
      {
        name: "overview",
        label: "Overview",
        type: "textarea",
      },
      {
        name: "status",
        label: "Status",
        type: "text",
      },
      {
        name: "locations",
        label: "Locations",
        type: "referenceArray",
        referenceTypes: ["location", "city"],
      },
      {
        name: "npcs",
        label: "NPCs",
        type: "referenceArray",
        referenceType: "npc",
      },
      {
        name: "player_characters",
        label: "Player Characters",
        type: "referenceArray",
        referenceType: "player_character",
      },
      {
        name: "outcome",
        label: "Outcome",
        type: "textarea",
      },
      {
        name: "consequences",
        label: "Consequences",
        type: "textarea",
      },
    ],

    world_event: [
      ...COMMON_FIELDS,
      {
        name: "type",
        label: "Type",
        type: "text",
      },
      {
        name: "status",
        label: "Status",
        type: "text",
      },
      {
        name: "locations",
        label: "Locations",
        type: "referenceArray",
        referenceTypes: ["location", "city"],
      },
      {
        name: "characters",
        label: "Characters",
        type: "referenceArray",
        referenceTypes: ["npc", "player_character"],
      },
      {
        name: "campaigns",
        label: "Campaigns",
        type: "referenceArray",
        referenceType: "campaign",
      },
      {
        name: "world_stories",
        label: "World Stories",
        type: "referenceArray",
        referenceType: "world_story",
      },
      {
        name: "world_story_threads",
        label: "World Story Threads",
        type: "objectArray",
        accordion: true,
        accordionTitleField: "thread_id",
        fields: [
          { name: "world_story_id", label: "World Story", type: "reference", referenceType: "world_story" },
          { name: "thread_id", label: "Thread ID", type: "text" },
        ],
      },
      {
        name: "timeline_event_id",
        label: "Timeline Record",
        type: "reference",
        referenceType: "timeline_event",
      },
      {
        name: "caused_by",
        label: "Caused By",
        type: "referenceArray",
        referenceTypes: ["world_event", "timeline_event"],
      },
      {
        name: "true_causes",
        label: "True Causes",
        type: "referenceArray",
        referenceTypes: ["world_event", "timeline_event"],
      },
      {
        name: "hidden_connections",
        label: "Hidden Connections",
        type: "referenceArray",
        referenceTypes: ["world_event", "timeline_event"],
      },
      {
        name: "dm_notes",
        label: "DM Notes",
        type: "textarea",
      },
      {
        name: "consequences",
        label: "Consequences",
        type: "array",
      },
      {
        name: "potential_campaign",
        label: "Potential Campaign",
        type: "boolean",
      },
    ],

    world_story: [
      ...COMMON_FIELDS,
      {
        name: "overview",
        label: "Overview",
        type: "textarea",
      },
      {
        name: "status",
        label: "Status",
        type: "text",
      },
      {
        name: "characters",
        label: "Characters",
        type: "referenceArray",
        referenceTypes: ["npc", "player_character"],
      },
      {
        name: "campaigns",
        label: "Campaigns",
        type: "referenceArray",
        referenceType: "campaign",
      },
      {
        name: "world_events",
        label: "World Events",
        type: "referenceArray",
        referenceType: "world_event",
      },
      {
        name: "threads",
        label: "Story Threads",
        type: "objectArray",
        accordion: true,
        accordionTitleField: "name",
        fields: [
          { name: "id", label: "Thread ID", type: "text", generated: true },
          { name: "name", label: "Name", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "status", label: "Status", type: "text" },
          { name: "campaigns", label: "Campaigns", type: "referenceArray", referenceType: "campaign" },
          { name: "world_events", label: "World Events", type: "referenceArray", referenceType: "world_event" },
        ],
      },
      {
        name: "contributions",
        label: "Campaign Contributions",
        type: "objectArray",
        accordion: true,
        accordionTitleField: "summary",
        fields: [
          { name: "campaign_id", label: "Campaign", type: "reference", referenceType: "campaign" },
          { name: "source_type", label: "Source Type", type: "text" },
          { name: "source_id", label: "Source ID", type: "text" },
          { name: "summary", label: "Campaign Outcome or Consequence", type: "textarea" },
          { name: "connection_status", label: "Connection", type: "text" },
          { name: "dm_notes", label: "DM Notes", type: "textarea" },
          { name: "thread_ids", label: "Story Thread IDs", type: "array" },
        ],
      },
    ],

    dm_scratchpad_entry: [
      ...COMMON_FIELDS,
      { name: "content", label: "Notes", type: "textarea" },
      {
        name: "status",
        label: "Status",
        type: "autocomplete",
        options: [
          { value: "inbox", label: "Inbox" },
          { value: "developing", label: "Developing" },
          { value: "promoted", label: "Promoted" },
          { value: "archived", label: "Archived" },
        ],
      },
      { name: "promoted_entity_id", label: "Promoted Entity", type: "reference", referenceType: "entity" },
      { name: "promoted_subentity_id", label: "Promoted Item ID", type: "text" },
      { name: "promoted_as", label: "Promoted As", type: "text" },
    ],

    timeline_event: [
      ...COMMON_FIELDS,
      {
        name: "era",
        label: "Era",
        type: "text",
      },
      {
        name: "date",
        label: "Date label",
        type: "text",
      },
      {
        name: "date_precision",
        label: "Date precision",
        type: "autocomplete",
        options: [
          { value: "unknown", label: "Unknown" },
          { value: "exact", label: "Exact date" },
          { value: "year", label: "Year" },
          { value: "approximate", label: "Approximate" },
          { value: "range", label: "Date range" },
        ],
      },
      {
        name: "date_start",
        label: "Date start (year or YYYY-MM-DD; BCE years may be negative)",
        type: "text",
      },
      {
        name: "date_end",
        label: "Date end (for ranges)",
        type: "text",
      },
      {
        name: "locations",
        label: "Locations",
        type: "referenceArray",
        referenceTypes: ["location", "city"],
      },
      {
        name: "kingdoms",
        label: "Kingdoms",
        type: "referenceArray",
        referenceType: "kingdom",
      },
      {
        name: "characters",
        label: "Characters",
        type: "referenceArray",
        referenceTypes: ["npc", "player_character"],
      },
      {
        name: "campaigns",
        label: "Campaigns",
        type: "referenceArray",
        referenceType: "campaign",
      },
      {
        name: "world_stories",
        label: "World Stories",
        type: "referenceArray",
        referenceType: "world_story",
      },
      {
        name: "world_story_threads",
        label: "World Story Threads",
        type: "objectArray",
        accordion: true,
        accordionTitleField: "thread_id",
        fields: [
          { name: "world_story_id", label: "World Story", type: "reference", referenceType: "world_story" },
          { name: "thread_id", label: "Thread ID", type: "text" },
        ],
      },
      {
        name: "source_world_event_id",
        label: "Source World Event",
        type: "reference",
        referenceType: "world_event",
      },
      {
        name: "event_links",
        label: "Event Connections",
        type: "objectArray",
        accordion: true,
        accordionTitleField: "relationship",
        fields: [
          {
            name: "event_id",
            label: "Event",
            type: "reference",
            referenceTypes: ["timeline_event", "world_event"],
          },
          {
            name: "relationship",
            label: "Relationship",
            type: "autocomplete",
            options: [
              { value: "caused_by", label: "Caused by" },
              { value: "leads_to", label: "Leads to" },
              { value: "related_to", label: "Related to" },
            ],
          },
        ],
      },
      {
        name: "campaign_sources",
        label: "Campaign Sources",
        type: "objectArray",
        accordion: true,
        accordionTitleField: "campaign_id",
        fields: [
          { name: "campaign_id", label: "Campaign", type: "reference", referenceType: "campaign" },
          { name: "session", label: "Session", type: "number" },
          { name: "plot_point_ids", label: "Plot Point IDs", type: "array", hidden: true },
          { name: "plot_point_names", label: "Plot Points", type: "array" },
          { name: "consequence_ids", label: "Consequence IDs", type: "array", hidden: true },
          { name: "consequence_descriptions", label: "Consequences", type: "array" },
          { name: "player_action_ids", label: "Player Action IDs", type: "array", hidden: true },
          { name: "player_action_descriptions", label: "Player Actions", type: "array" },
        ],
      },
      {
        name: "consequences",
        label: "Consequences",
        type: "array",
      },
      {
        name: "dm_notes",
        label: "DM Notes",
        type: "textarea",
      },
    ],

    lore: [
      ...COMMON_FIELDS,
      {
        name: "common_knowledge",
        label: "Common Knowledge",
        type: "textarea",
      },
      {
        name: "common_knowledge_locations",
        label: "Common in Locations (empty means broadly known)",
        type: "referenceArray",
        referenceTypes: ["continent", "kingdom", "region", "city", "location"],
      },
      {
        name: "campaigns",
        label: "Campaigns",
        type: "referenceArray",
        referenceType: "campaign",
      },
      {
        name: "details",
        label: "Details",
        type: "textarea",
      },
      {
        name: "dm_notes",
        label: "DM Notes",
        type: "textarea",
      },
    ],

    artifact: [
      ...COMMON_FIELDS,
      {
        name: "details",
        label: "Details",
        type: "textarea",
      },
      {
        name: "dm_notes",
        label: "DM Notes",
        type: "textarea",
      },
    ],

    map: [
      ...COMMON_FIELDS,
      {
        name: "map_type",
        label: "Map Type",
        type: "text",
      },
      {
        name: "parent_map",
        label: "Parent Map",
        type: "reference",
        referenceType: "map",
      },
      {
        name: "entity_id",
        label: "Entity",
        type: "reference",
      },
      {
        name: "image_path",
        label: "Image Path",
        type: "text",
      },
      {
        name: "linked_map",
        label: "Linked Map",
        type: "reference",
        referenceType: "map",
      },
      {
        name: "tooltip",
        label: "Tooltip",
        type: "text",
      },
      {
        name: "details",
        label: "Details",
        type: "textarea",
      },
      {
        name: "dm_notes",
        label: "DM Notes",
        type: "textarea",
      },
      {
        name: "markers",
        label: "Markers",
        type: "objectArray",
        accordion: true,
        accordionTitleField: "label",
        fields: [
          {
            name: "id",
            label: "Marker ID",
            type: "text",
            generated: true,
          },
          {
            name: "entity_id",
            label: "Entity",
            type: "reference",
          },
          {
            name: "label",
            label: "Label",
            type: "text",
          },
          {
            name: "icon",
            label: "Icon",
            type: "icon",
          },
          {
            name: "tooltip",
            label: "Tooltip",
            type: "text",
          },
          {
            name: "linked_map",
            label: "Linked Map",
            type: "reference",
            referenceType: "map",
          },
          {
            name: "type",
            label: "Type",
            type: "autocomplete",
            options: [
              { value: "point", label: "Point" },
              { value: "area", label: "Area" },
              { value: "path", label: "Path" },
            ],
          },
          {
            name: "points",
            label: "Points",
            type: "text",
            hidden: true,
          },
          {
            name: "fill_color",
            label: "Color",
            type: "color",
          },
          {
            name: "fill_opacity",
            label: "Fill Opacity",
            type: "number",
          },
          {
            name: "x",
            label: "X Position",
            type: "number",
          },
          {
            name: "y",
            label: "Y Position",
            type: "number",
          },
          {
            name: "hide_label",
            label: "Hide Label",
            type: "boolean",
          },
          {
            name: "visible",
            label: "Visible",
            type: "boolean",
          },
          {
            name: "dm_only",
            label: "DM Only",
            type: "boolean",
          },
        ],
      },
    ],
  };
