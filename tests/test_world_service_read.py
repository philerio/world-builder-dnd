from pathlib import Path

from worldbuilder.models.lore import Lore
from worldbuilder.services.world_service import WorldService


def test_world_service_gets_existing_entity(tmp_path: Path) -> None:
    service = WorldService(tmp_path)

    lore = Lore(
        id="test-lore",
        name="Test Lore",
        description="A test entry.",
        details="Some details.",
    )

    service.save_entity(lore)

    loaded = service.get_entity(
        "test-lore",
        Lore,
    )

    assert loaded == lore
    assert loaded.name == "Test Lore"
    assert loaded.details == "Some details."


def test_world_service_get_requires_existing_entity(
    tmp_path: Path,
) -> None:
    service = WorldService(tmp_path)

    try:
        service.get_entity(
            "missing-lore",
            Lore,
        )
        assert False, "Expected FileNotFoundError"
    except FileNotFoundError as exc:
        assert "missing-lore.yaml" in str(exc)


def test_world_service_edits_yaml_without_reformatting(tmp_path: Path) -> None:
    service = WorldService(tmp_path)
    service.save_entity(Lore(id="test-lore", name="Test Lore", details="Original."))
    content, path = service.read_entity_yaml("test-lore", Lore)
    edited = content.replace("Original.", "Updated.") + "\n# Keep this comment.\n"

    saved_path = service.update_entity_yaml("test-lore", Lore, edited)

    assert saved_path == path
    assert saved_path.read_text(encoding="utf-8") == edited
    assert service.get_entity("test-lore", Lore).details == "Updated."


def test_world_service_rejects_invalid_yaml_and_entity_id_changes(tmp_path: Path) -> None:
    service = WorldService(tmp_path)
    service.save_entity(Lore(id="test-lore", name="Test Lore"))
    original, _ = service.read_entity_yaml("test-lore", Lore)

    try:
        service.update_entity_yaml("test-lore", Lore, "name: [invalid")
        assert False, "Expected invalid YAML to be rejected"
    except ValueError as exc:
        assert "Invalid YAML" in str(exc)

    try:
        service.update_entity_yaml("test-lore", Lore, original.replace("test-lore", "changed-id"))
        assert False, "Expected changing the entity ID to be rejected"
    except ValueError as exc:
        assert "ID cannot be changed" in str(exc)

    unchanged, _ = service.read_entity_yaml("test-lore", Lore)
    assert unchanged == original


def test_world_service_repairs_a_yaml_source_by_known_type(tmp_path: Path) -> None:
    service = WorldService(tmp_path)
    lore_directory = tmp_path / "lore"
    lore_directory.mkdir()
    source = lore_directory / "broken-lore.yaml"
    source.write_text("id: [broken\n", encoding="utf-8")

    loaded, path = service.read_yaml_source("lore", "broken-lore.yaml")
    assert loaded == "id: [broken\n"
    assert path == source

    repaired = "id: repaired-lore\nname: Repaired Lore\n"
    service.update_yaml_source("lore", "broken-lore.yaml", repaired)

    assert source.read_text(encoding="utf-8") == repaired


def test_world_service_yaml_source_rejects_unapproved_paths(tmp_path: Path) -> None:
    service = WorldService(tmp_path)

    try:
        service.read_yaml_source("lore", "../world.yaml")
        assert False, "Expected a path outside the entity directory to be rejected"
    except ValueError as exc:
        assert "file name" in str(exc)


def test_world_service_can_restore_a_missing_world_file(tmp_path: Path) -> None:
    service = WorldService(tmp_path)
    content, path = service.read_yaml_source("world", "world.yaml")
    assert "continents: []" in content

    restored = "id: test-world\nname: Test World\nversion: '1'\nauthor: Test\ncontinents: []\n"
    service.update_yaml_source("world", "world.yaml", restored)

    assert path.read_text(encoding="utf-8") == restored


def test_yaml_source_preview_and_backup_restore(tmp_path: Path) -> None:
    service = WorldService(tmp_path)
    source_directory = tmp_path / "lore"
    source_directory.mkdir()
    source = source_directory / "test-lore.yaml"
    original = "id: test-lore\nname: Original Lore\n"
    source.write_text(original, encoding="utf-8")
    proposed = "id: test-lore\nname: Updated Lore\n"

    preview = service.preview_yaml_source("lore", "test-lore.yaml", proposed)

    assert preview["valid"] is True
    assert preview["has_changes"] is True
    assert "-name: Original Lore" in preview["diff"]
    assert source.read_text(encoding="utf-8") == original

    service.update_yaml_source("lore", "test-lore.yaml", proposed)
    backups = service.list_yaml_backups("lore", "test-lore.yaml")
    assert len(backups) == 1

    service.update_yaml_source("lore", "test-lore.yaml", "id: test-lore\nname: Newest Lore\n")
    newest_backup = service.list_yaml_backups("lore", "test-lore.yaml")[0]
    service.restore_yaml_backup("lore", "test-lore.yaml", newest_backup["backup_id"])

    assert source.read_text(encoding="utf-8") == proposed
    assert len(service.list_yaml_backups("lore", "test-lore.yaml")) == 3
