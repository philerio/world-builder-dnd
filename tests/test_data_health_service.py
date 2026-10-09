from pathlib import Path

from worldbuilder.services.data_health_service import scan_yaml_sources
from worldbuilder.services.world_service import WorldService


def test_yaml_health_scan_reports_parse_and_schema_errors(tmp_path: Path) -> None:
    world_path = tmp_path / "world.yaml"
    world_path.write_text(
        "id: test-world\nname: Test World\nversion: '1'\nauthor: Test\ncontinents: []\n",
        encoding="utf-8",
    )
    lore_directory = tmp_path / "lore"
    lore_directory.mkdir()
    (lore_directory / "broken-yaml.yaml").write_text("id: [broken\n", encoding="utf-8")
    (lore_directory / "missing-name.yaml").write_text("id: missing-name\n", encoding="utf-8")

    issues = scan_yaml_sources(world_path)

    assert len(issues) == 2
    assert {issue["source_path"] for issue in issues} == {
        "lore/broken-yaml.yaml",
        "lore/missing-name.yaml",
    }
    assert all(issue["severity"] == "error" for issue in issues)


def test_yaml_health_scan_reports_duplicate_ids_across_files(tmp_path: Path) -> None:
    world_path = tmp_path / "world.yaml"
    world_path.write_text(
        "id: test-world\nname: Test World\nversion: '1'\nauthor: Test\ncontinents: []\n",
        encoding="utf-8",
    )
    lore_directory = tmp_path / "lore"
    lore_directory.mkdir()
    lore_source = "id: duplicated\nname: Duplicate\n"
    (lore_directory / "first.yaml").write_text(lore_source, encoding="utf-8")
    (lore_directory / "second.yaml").write_text(lore_source, encoding="utf-8")

    issues = scan_yaml_sources(world_path)

    assert len(issues) == 2
    assert all("Duplicate entity ID 'duplicated'" in issue["message"] for issue in issues)


def test_reference_repair_changes_only_the_selected_scalar_and_previews(tmp_path: Path) -> None:
    lore_directory = tmp_path / "lore"
    lore_directory.mkdir()
    source = (
        "id: old-lore\n"
        "name: Old Lore\n"
        "campaigns:\n"
        "  - missing-campaign # keep this note\n"
    )
    (lore_directory / "old-lore.yaml").write_text(source, encoding="utf-8")

    result = WorldService(tmp_path).prepare_reference_repair(
        "lore",
        "old-lore.yaml",
        ["campaigns", 0],
        "missing-campaign",
        "real-campaign",
    )

    assert result["valid"] is True
    assert result["has_changes"] is True
    assert result["content"] == source.replace(
        "missing-campaign # keep this note",
        '"real-campaign" # keep this note',
    )
    assert "-  - missing-campaign" in result["diff"]
    assert '+  - "real-campaign" # keep this note' in result["diff"]
