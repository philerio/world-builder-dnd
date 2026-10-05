# Elligaesia — World Bible Handoff

## World identity

**Elligaesia** is a high-fantasy world containing the continents of **Elligaesia** and **Rendelle**.

The structured export currently contains:

- 1 World
- 2 Continents
- 0 Kingdom records
- 0 Region records
- 2 Cities
- 19 NPCs
- 3 Player Characters
- 2 Campaigns
- 6 World Events
- 15 Timeline Events
- 3 Lore records
- 1 Artifact
- 0 Maps in that structured export

The world data is still growing; empty categories should not be interpreted as "these things do not exist in the fiction."

## Geography

### Continents

- Elligaesia
- Rendelle

### Batik

The world bible template describes Batik as the home of Reqrun. The structured export does not currently contain a Kingdom entity for Batik, so treat it as a known geographic/political name rather than inventing an entity ID.

### Reqrun

Town in Batik. Major recurring campaign location.

### Stratos

A High Elf city believed to have been lost.

Stratos is suspended in the sky and ruled by Dorith. Mechanized golems enforce Dorith's control.

The city was originally ground-based and was lifted into the sky using ancient Dwarmar technology.

The technology is slowly draining life from the surrounding land, causing a desert to expand.

The intended eventual solution is to disable the mechanism:

- golems lose power
- people trapped under Dorith's control are freed
- desert expansion stops
- Stratos descends toward the ground

## Ancient history

The world bible template identifies:

1. Rise of the Dwarmar
2. Creation of the Power Sources
3. Bane interferes with mortals and is banished
4. Separation of northern and southern kingdoms
5. Fall of the Dwarmar

The structured timeline also contains Dronath being awakened and later Reqrun/Stratos events.

## Dwarmar

The Dwarmar are an ancient civilization associated with powerful technology and the Power Sources.

Their technology remains active in the modern world, especially in Stratos.

The developer has described the Dwarmar as ancient dwarves in campaign/world discussions.

## Bane

Bane is a powerful sorcerer who was banished after interfering with mortals.

Campaign material describes Bane as seeking control over everyone and everything, slowly and methodically.

Bane has cult followers throughout the kingdom and is represented by a closed hand with green light shining from it.

## Stratos family

### Aerick

High Elf of Stratos and Aerith's father.

Aerick used ancient Dwarmar technology to lift Stratos into the sky. He and Aerith disappeared approximately 400 years ago, after which Stratos was believed lost.

### Elorith

Aerick's spouse and Aerith's mother. She is Dorith's sister.

Structured lore says Elorith's transformation into a mechanized golem is important to the Stratos storyline.

### Dorith

Aerith's maternal uncle and current ruler of Stratos.

He controls the city through mechanized golems.

### Aerith

High Elf connected to the Stratos ruling family and a player character in the structured data.

## Other known NPCs

The structured world export contains these NPCs:

- Aerick
- Alatar
- Albert
- Ann
- Bane
- William "Bill"
- Dobby
- Dorith
- Dronath
- Elorith
- Emmyth Carfir
- Faela Logleragle
- Frank
- Fredrick
- Narle
- Nedda
- Orivom
- Pattrice
- Shana

The exact details of every NPC are stored in the structured world export. Codex should prefer repository data when available rather than reconstructing NPC details from this summary.

## Player characters

Structured export:

- Aerith
- Harry
- Rowan

Rowan and Harry have extensive campaign-relevant details in `CAMPAIGN_UNFORGIVEN.md`.

## World events

Known world events include:

- Collapse of the Batik Trade Route
- Elligaesia Trade Dispute
- Serenno Civil War Event
- Stratos Golem Conversion
- Teth-Umbara Island Conflict Event
- Zeffo Undead Sightings

## Timeline events

Known timeline records include:

- Bane Is Banished
- Creation of the Power Sources
- Dronath Is Awakened
- Fall of the Dwarmar
- Reqrun Animal Disappearances
- Reqrun Crisis Resolved
- Rise of the Dwarmar
- Separation of the Northern and Southern Kingdoms
- Serenno Civil War
- The Sorcerer's Identity Is Revealed
- Stratos Returns
- Stratos Revealed
- Teth and Umbara Contest the Mysterious Island
- Undead Appear in Zeffo

The export contains two records named `Bane Is Banished`; inspect IDs before deduplicating anything.

## Artifacts

### Stratos Dwarmar Mechanism

Ancient Dwarmar mechanism that keeps Stratos suspended and powers the mechanized golems.

### Holy Hand Grenade

Stored in the church at Reqrun and used to defeat the empowered White Rabbit.

### Bill's Greatsword

Family heirloom recovered by Bill after it had been sold by his son.

## Plot hooks from the world bible

Known hooks include:

- Aerith's floating city / Stratos
- Golems created from imprisoned people
- Dorith is Aerith's uncle
- Bane's influence
- future Albert sightings

## Canon handling

Some source documents use different spellings or descriptions. For example, the campaign document uses **Abeloth**, while structured campaign data uses **Aboleth**. Preserve source terminology in source-derived notes and flag the discrepancy rather than silently choosing one.
