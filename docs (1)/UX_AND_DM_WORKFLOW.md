# DM Workflow and UX Intent

## The user is the DM

The application is being designed for actual campaign use, not merely as a generic CRUD database.

The developer's working style is:

1. Think through a story.
2. Dump ideas into a document.
3. Develop encounters, NPC motivations, clues, secrets and possible paths.
4. Run the session.
5. Let players make unexpected decisions.
6. Adapt the story.
7. Preserve what actually happened as new canon.

The application should support this naturally.

## Preparation mode

Preparation should emphasize:

- graph/flow visualization
- beats and branches
- secrets
- possible approaches
- NPCs/locations involved
- planned consequences
- clocks
- notes

## Session mode

Session mode should emphasize:

- what is happening now
- what the players know
- important NPCs nearby
- current location
- unresolved consequences
- active clocks
- quick action logging
- quick status changes

The DM should not have to open a full entity editor every time they want to record a player decision.

## Player knowledge vs DM knowledge

This distinction matters.

Some campaign information is intentionally secret:

- true villain identity
- hidden motivations
- future events
- consequences the players have not triggered
- DM notes

Other information is explicitly player knowledge.

The Story Planner should therefore eventually support DM-only fields and player-visible/public content separately.

## Entity linking

The application already has a concept of story content with clickable entity links. This is important to preserve because a DM should be able to move from:

`Frank` -> NPC
`Reqrun` -> City
`Northern Lake` -> Location/map
`Dronath` -> NPC/creature/entity

without duplicating all information in every story node.

## Avoid over-structuring

Not every creative note needs a new entity.

A DM should be able to keep a rough note until it becomes important enough to structure.
