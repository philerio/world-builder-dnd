from pathlib import Path

import typer
from pydantic import ValidationError
from rich import print

from worldbuilder.loaders.yaml_loader import load_world

app = typer.Typer(
    help="World Builder D&D",
)


WORLD_PATH = Path("worlds/elligaesia/world.yaml")


@app.command()
def validate() -> None:
    """Validate the world data."""

    print("[bold]Loading World...[/bold]")
    print()

    try:
        world = load_world(WORLD_PATH)

    except FileNotFoundError:
        print(f"[red]✗ World file not found:[/red] {WORLD_PATH}")
        raise typer.Exit(code=1)

    except ValidationError as error:
        print("[red]✗ World validation failed[/red]")
        print()
        print(error)
        raise typer.Exit(code=1)

    print(f"[green]✓ World loaded:[/green] {world.name}")
    print(f"[green]✓ ID:[/green] {world.id}")
    print(f"[green]✓ Version:[/green] {world.version}")
    print(f"[green]✓ Continents:[/green] {len(world.continents)}")
    print()
    print("[bold green]Validation successful.[/bold green]")


@app.command()
def sync() -> None:
    """Synchronize with Notion."""

    print("[cyan]Sync is not implemented yet.[/cyan]")


@app.command()
def init() -> None:
    """Initialize a new workspace."""

    print("[cyan]Initialization is not implemented yet.[/cyan]")


@app.command()
def export() -> None:
    """Export the world."""

    print("[cyan]Export is not implemented yet.[/cyan]")


if __name__ == "__main__":
    app()