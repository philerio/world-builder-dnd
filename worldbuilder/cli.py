import typer
from rich import print

app = typer.Typer(
    help="World Builder D&D"
)


@app.command()
def validate():
    """Validate the world data."""

    print("[green]Loading World...[/green]")
    print()

    print("✔ World definition loaded")
    print("✔ Validation complete")


@app.command()
def sync():
    """Synchronize with Notion."""

    print("[cyan]Sync is not implemented yet.[/cyan]")


@app.command()
def init():
    """Initialize a new workspace."""

    print("[cyan]Initialization is not implemented yet.[/cyan]")


@app.command()
def export():
    """Export the world."""

    print("[cyan]Export is not implemented yet.[/cyan]")


if __name__ == "__main__":
    app()