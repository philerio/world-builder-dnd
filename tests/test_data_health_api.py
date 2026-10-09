from pathlib import Path

import pytest
from fastapi import HTTPException

from worldbuilder.api import app as api_module


def write_test_world(world_path: Path) -> None:
    world_path.write_text(
        "id: test-world\nname: Test World\nversion: '1'\nauthor: Test\ncontinents: []\n",
        encoding="utf-8",
    )


def test_data_health_recovers_a_yaml_parse_error(tmp_path: Path, monkeypatch) -> None:
    world_path = tmp_path / "world.yaml"
    write_test_world(world_path)
    lore_directory = tmp_path / "lore"
    lore_directory.mkdir()
    broken_source = lore_directory / "broken-lore.yaml"
    broken_source.write_text("id: [broken\n", encoding="utf-8")
    monkeypatch.setattr(api_module, "WORLD_PATH", world_path)

    report = api_module.validate_world_data()
    assert report["valid"] is False
    assert report["issues"][0]["source_path"] == "lore/broken-lore.yaml"

    source = api_module.get_data_health_yaml("lore", "broken-lore.yaml")
    assert source["content"] == "id: [broken\n"

    saved = api_module.update_data_health_yaml(
        "lore",
        "broken-lore.yaml",
        {"content": "id: test-lore\nname: Test Lore\n"},
    )
    assert saved["path"] == "lore/broken-lore.yaml"
    assert broken_source.read_text(encoding="utf-8") == "id: test-lore\nname: Test Lore\n"
    assert api_module.validate_world_data()["valid"] is True

    proposed = "id: test-lore\nname: Revised Lore\n"
    preview = api_module.preview_data_health_yaml(
        "lore",
        "broken-lore.yaml",
        {"content": proposed},
    )
    assert preview["valid"] is True
    assert "-name: Test Lore" in preview["diff"]
    assert broken_source.read_text(encoding="utf-8") == "id: test-lore\nname: Test Lore\n"

    backups = api_module.list_data_health_yaml_backups("lore", "broken-lore.yaml")
    assert len(backups) == 1
    api_module.restore_data_health_yaml_backup(
        "lore",
        "broken-lore.yaml",
        {"backup_id": backups[0]["backup_id"]},
    )
    assert broken_source.read_text(encoding="utf-8") == "id: [broken\n"


def test_data_health_does_not_save_invalid_yaml(tmp_path: Path, monkeypatch) -> None:
    world_path = tmp_path / "world.yaml"
    write_test_world(world_path)
    lore_directory = tmp_path / "lore"
    lore_directory.mkdir()
    broken_source = lore_directory / "broken-lore.yaml"
    original = "id: test-lore\nname: Test Lore\n"
    broken_source.write_text(original, encoding="utf-8")
    monkeypatch.setattr(api_module, "WORLD_PATH", world_path)

    with pytest.raises(HTTPException) as error:
        api_module.update_data_health_yaml(
            "lore",
            "broken-lore.yaml",
            {"content": "id: [broken\n"},
        )

    assert error.value.status_code == 422
    assert broken_source.read_text(encoding="utf-8") == original
