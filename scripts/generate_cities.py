from pathlib import Path

import yaml

CITIES = [

    {
        "id": "colkirk",
        "name": "Colkirk",
        "description": "A city in Batik located along the region's major road network.",
    },
    {
        "id": "easton",
        "name": "Easton",
        "description": "A city in eastern Batik located along the major road network.",
    },
    {
        "id": "halfington",
        "name": "Halfington",
        "description": "A settlement in western Batik near the forests and roads of the region.",
    },
    {
        "id": "larton",
        "name": "Larton",
        "description": "A city in Batik located along the road network west of Baldon.",
    },
    {
        "id": "ole-hythe",
        "name": "Ole Hythe",
        "description": "A city in Batik located along the central road network.",
    },
    {
        "id": "reqrun",
        "name": "Reqrun",
        "description": "A city in northern Batik situated near the Mountains of Bane and the North Road.",
    },
    {
        "id": "shodar",
        "name": "Shodar",
        "description": "A coastal city in southern Batik.",
    },
    {
        "id": "west-town",
        "name": "West Town",
        "description": "A settlement in central Batik located along the major road network.",
    },
]


def main() -> None:
    cities_dir = Path("worlds/elligaesia/cities")
    cities_dir.mkdir(parents=True, exist_ok=True)

    for city in CITIES:
        output_path = cities_dir / f"{city['id']}.yaml"

        if output_path.exists():
            print(f"Skipping existing file: {output_path}")
            continue

        output_path.write_text(
            yaml.safe_dump(
                city,
                sort_keys=False,
                allow_unicode=True,
            ),
            encoding="utf-8",
        )

        print(f"Created: {output_path}")


if __name__ == "__main__":
    main()
