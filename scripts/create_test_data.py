from pathlib import Path

BASE = Path("tests/data/test-world")

FILES = {
    "world.yaml": """\
id: test-world
name: Test World
description: A minimal world used for automated tests.
version: "1.0"
author: Test
continents:
  - test-continent
""",

    "continents/test-continent.yaml": """\
id: test-continent
name: Test Continent
description: A continent used for automated tests.
""",

    "kingdoms/test-kingdom.yaml": """\
id: test-kingdom
name: Test Kingdom
description: A kingdom used for automated tests.
""",

    "regions/test-region.yaml": """\
id: test-region
name: Test Region
description: A region used for automated tests.
kingdom: test-kingdom
continent: test-continent
""",

    "cities/test-city.yaml": """\
id: test-city
name: Test City
description: A city used for automated tests.
kingdom: test-kingdom
region: test-region
population: 1000
""",

    "npcs/test-npc.yaml": """\
id: test-npc
name: Test NPC
description: An NPC used for automated tests.
role: Test NPC
city: test-city
region: test-region
kingdom: test-kingdom
""",

    "player_characters/test-pc.yaml": """\
id: test-pc
name: Test PC
description: A player character used for automated tests.
role: Adventurer
city: test-city
region: test-region
kingdom: test-kingdom
""",

    "campaigns/test-campaign.yaml": """\
id: test-campaign
name: Test Campaign
description: A campaign used for automated tests.
overview: A test campaign.
status: active
locations:
  - test-city
npcs:
  - test-npc
player_characters:
  - test-pc
""",

    "events/test-event.yaml": """\
id: test-event
name: Test World Event
description: A world event used for automated tests.
type: test
status: ongoing
locations:
  - test-city
campaigns:
  - test-campaign
""",

    "timeline/test-timeline-event.yaml": """\
id: test-timeline-event
name: Test Timeline Event
description: A timeline event used for automated tests.
era: Test Era
date: null
locations:
  - test-city
kingdoms:
  - test-kingdom
characters:
  - test-npc
  - test-pc
campaigns:
  - test-campaign
consequences: []
dm_notes: null
""",

    "lore/test-lore.yaml": """\
id: test-lore
name: Test Lore
description: Lore used for automated tests.
""",
"artifacts/test-artifact.yaml": """\
id: test-artifact
name: Test Artifact
description: An artifact used for automated tests.
details: A mysterious object used to verify artifact loading.
""",
}


def main() -> None:
    for relative_path, content in FILES.items():
        path = BASE / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        print(f"Created {path}")

    print(f"\\nCreated test world at {BASE}")


if __name__ == "__main__":
    main()