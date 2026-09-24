export type EntityFieldType =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "reference"
  | "referenceArray"
  | "array"
  | "objectArray"
  | "icon";

export type EntityFieldDefinition = {
  name: string;
  label: string;
  type: EntityFieldType;
  referenceType?: string;
  fields?: EntityFieldDefinition[];
  generated?: boolean;
  accordion?: boolean;
  accordionTitleField?: string;
};

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
];

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
            referenceType: "location",
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
        referenceType: "location",
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
        referenceType: "location",
      },
      {
        name: "campaigns",
        label: "Campaigns",
        type: "referenceArray",
        referenceType: "campaign",
      },
      {
        name: "caused_by",
        label: "Caused By",
        type: "referenceArray",
      },
      {
        name: "true_causes",
        label: "True Causes",
        type: "referenceArray",
      },
      {
        name: "hidden_connections",
        label: "Hidden Connections",
        type: "referenceArray",
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

    timeline_event: [
      ...COMMON_FIELDS,
      {
        name: "era",
        label: "Era",
        type: "text",
      },
      {
        name: "date",
        label: "Date",
        type: "text",
      },
      {
        name: "locations",
        label: "Locations",
        type: "referenceArray",
        referenceType: "location",
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
      },
      {
        name: "campaigns",
        label: "Campaigns",
        type: "referenceArray",
        referenceType: "campaign",
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
