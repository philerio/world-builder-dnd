from pathlib import Path

import yaml


CITIES = [
    {
        "id": "moria",
        "name": "Moria",
    },
    {
        "id": "old-york",
        "name": "Old York",
    },
    {
        "id": "york",
        "name": "York",
    },
    {
        "id": "sakar",
        "name": "Sakar",
    },
    {
        "id": "gangalor",
        "name": "Gangalor",
    },
    {
        "id": "carthan",
        "name": "Carthan",
    },
    {
        "id": "archeopia",
        "name": "Archeopia",
    },
    {
        "id": "lake-town",
        "name": "Lake Town",
    },
    {
        "id": "grimsard",
        "name": "Grimsard",
    },
]


OUTPUT_DIR = Path("worlds/rendelle/cities")


def generate_city_files() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for city in CITIES:
        output_path = OUTPUT_DIR / f"{city['id']}.yaml"

        with output_path.open("w", encoding="utf-8") as file:
            yaml.safe_dump(
                city,
                file,
                sort_keys=False,
                allow_unicode=True,
            )

        print(f"Created {output_path}")


if __name__ == "__main__":
    generate_city_files()