#!/bin/bash

TEMPLATE_DIR="worlds/elligaesia/templates"

mkdir -p "$TEMPLATE_DIR"

cat > "$TEMPLATE_DIR/world.yaml" <<'YAML'
id: example-world
name: Example World
description: >
  Description of the world.

version: "1.0"
author: Your Name

continents:
  - example-continent
YAML

cat > "$TEMPLATE_DIR/kingdom.yaml" <<'YAML'
id: example-kingdom
name: Example Kingdom
description: >
  Description of the kingdom.

ruler: null
capital: null
YAML

cat > "$TEMPLATE_DIR/region.yaml" <<'YAML'
id: example-region
name: Example Region
description: >
  Description of the region.

kingdom: null
continent: null
YAML

cat > "$TEMPLATE_DIR/city.yaml" <<'YAML'
id: example-city
name: Example City
description: >
  Description of the city.

kingdom: null
region: null
population: null
YAML

cat > "$TEMPLATE_DIR/building.yaml" <<'YAML'
id: example-building
name: Example Building
description: >
  Description of the building.

city: null
region: null
kingdom: null

details: >
  Additional information about the building.
YAML

cat > "$TEMPLATE_DIR/npc.yaml" <<'YAML'
id: example-npc
name: Example NPC
description: >
  Short description of the character.

details: >
  Background, personality, relationships, secrets,
  or other information.

role: null
city: null
region: null
kingdom: null

events:
  - description: >
      Something that happened to this character.
    campaign: null
    location: null
YAML

cat > "$TEMPLATE_DIR/player_character.yaml" <<'YAML'
id: example-character
name: Example Character
description: >
  Short description of the character.

details: >
  Background, personality, goals, relationships,
  and other character information.

role: player-character
city: null
region: null
kingdom: null

events:
  - description: >
      Something that happened to the character.
    campaign: null
    location: null
YAML

cat > "$TEMPLATE_DIR/campaign.yaml" <<'YAML'
id: example-campaign
name: Example Campaign
description: >
  Short description of the campaign.

overview: >
  Summary of the campaign's story.

status: ongoing

locations:
  - example-city

npcs:
  - example-npc

player_characters:
  - example-character

outcome: null

consequences: null
YAML

cat > "$TEMPLATE_DIR/quest.yaml" <<'YAML'
id: example-quest
name: Example Quest
description: >
  Description of the quest.

status: active

campaign: null
location: null

npcs:
  - example-npc

player_characters:
  - example-character

objective: >
  What the characters are trying to accomplish.

outcome: null
YAML

cat > "$TEMPLATE_DIR/magic_item.yaml" <<'YAML'
id: example-magic-item
name: Example Magic Item
description: >
  Description of the item.

details: >
  History, abilities, appearance, and other information.

type: unknown

owner: null
location: null
campaign: null
YAML

cat > "$TEMPLATE_DIR/monster.yaml" <<'YAML'
id: example-monster
name: Example Monster
description: >
  Description of the monster.

details: >
  Behavior, habitat, lore, and other information.

type: unknown

hit_points: null
armor_class: null

abilities:
  - name: Example Ability
    description: >
      Description of the ability.

campaign: null
location: null
YAML

cat > "$TEMPLATE_DIR/organization.yaml" <<'YAML'
id: example-organization
name: Example Organization
description: >
  Description of the organization.

details: >
  Purpose, history, beliefs, structure, and other information.

type: unknown

leader: null

locations:
  - example-city

members:
  - example-npc
YAML

cat > "$TEMPLATE_DIR/religion.yaml" <<'YAML'
id: example-religion
name: Example Religion
description: >
  Description of the religion.

details: >
  Beliefs, practices, history, gods, and other information.

deity: null

locations:
  - example-city

organizations:
  - example-organization
YAML

cat > "$TEMPLATE_DIR/map.yaml" <<'YAML'
id: example-map
name: Example Map
description: >
  Description of what the map represents.

type: regional

location: null

details: >
  Additional information about the map.
YAML

cat > "$TEMPLATE_DIR/timeline_event.yaml" <<'YAML'
id: example-event
name: Example Event
description: >
  Description of the historical event.

date: null

locations:
  - example-city

npcs:
  - example-npc

campaign: null

consequences: >
  What changed as a result of this event.
YAML

cat > "$TEMPLATE_DIR/README.md" <<'MARKDOWN'
# World Entity Templates

These files are blank starting points for creating new world entities.

## Available Templates

- `world.yaml` — World
- `kingdom.yaml` — Kingdom
- `region.yaml` — Region
- `city.yaml` — City
- `building.yaml` — Building
- `npc.yaml` — NPC
- `player_character.yaml` — Player Character
- `campaign.yaml` — Campaign
- `quest.yaml` — Quest
- `magic_item.yaml` — Magic Item
- `monster.yaml` — Monster
- `organization.yaml` — Organization
- `religion.yaml` — Religion
- `map.yaml` — Map
- `timeline_event.yaml` — Timeline Event

## Creating a New Entity

1. Copy the appropriate template.
2. Move it into the corresponding entity directory.
3. Change the `id`.
4. Fill in the information you know.
5. Leave unknown values as `null`.
6. Leave empty lists empty if there are no known relationships yet.
7. Run the tests and validator.

Unknown information does not need to be invented just to complete a record.
MARKDOWN

echo ""
echo "Created world entity templates in:"
echo "  $TEMPLATE_DIR"
echo ""
ls -1 "$TEMPLATE_DIR"
