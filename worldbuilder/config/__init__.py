import json
from pathlib import Path

from pydantic import BaseModel
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    world_data_dir: Path = Path("worlds/elligaesia")
    notion_token: str = ""
    notion_parent_page: str = ""

    class Config:
        env_file = ".env"


settings = Settings()

STORAGE_OVERRIDE_PATH = (
    Path(__file__).resolve().parents[2] / ".worldbuilder-storage.json"
)


class StorageOverride(BaseModel):
    enabled: bool = False
    path: str = ""


def load_storage_override() -> StorageOverride:
    try:
        payload = json.loads(STORAGE_OVERRIDE_PATH.read_text(encoding="utf-8"))
        return StorageOverride.model_validate(payload)
    except (OSError, json.JSONDecodeError, ValueError):
        return StorageOverride()


def current_world_data_dir() -> Path:
    override = load_storage_override()
    if override.enabled and override.path:
        return Path(override.path).expanduser()
    return settings.world_data_dir


def save_storage_override(enabled: bool, path: str) -> StorageOverride:
    override_path = Path(path).expanduser() if path.strip() else None
    if enabled:
        if override_path is None or not override_path.is_absolute():
            raise ValueError("Enter an absolute server path for the storage folder.")
        if not (override_path / "world.yaml").is_file():
            raise ValueError("The selected folder must contain world.yaml.")

    override = StorageOverride(enabled=enabled, path=str(override_path or ""))
    temporary_path = STORAGE_OVERRIDE_PATH.with_suffix(".tmp")
    temporary_path.write_text(
        json.dumps(override.model_dump(), indent=2) + "\n", encoding="utf-8"
    )
    temporary_path.replace(STORAGE_OVERRIDE_PATH)
    return override
