from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest
import yaml
from fastapi import HTTPException

from worldbuilder.api import app as api


@pytest.fixture
def map_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    (tmp_path / "world.yaml").write_text(yaml.safe_dump({"id": "revision-world", "name": "Revision World", "version": "1", "author": "Test", "continents": []}))
    (tmp_path / "maps").mkdir()
    path = tmp_path / "maps" / "authored-filename.yaml"
    path.write_text(yaml.safe_dump({"id": "review-map", "name": "Original map", "markers": []}))
    monkeypatch.setattr(api, "WORLD_PATH", tmp_path / "world.yaml")
    return path


def test_map_revision_is_stable_even_without_authored_timestamps(map_file: Path) -> None:
    first = api.get_entity("review-map")
    assert len(first["revision"]) == 64
    assert api.get_entity("review-map")["revision"] == first["revision"]
    assert "created" not in yaml.safe_load(map_file.read_text())


def test_stale_map_save_is_rejected_without_touching_the_file(map_file: Path) -> None:
    first = api.get_entity("review-map")
    saved = api.update_entity("review-map", {**first["entity"], "name": "Newer name", "_expected_revision": first["revision"]})
    assert saved["revision"] != first["revision"]
    before = map_file.read_bytes()
    with pytest.raises(HTTPException) as error:
        api.update_entity("review-map", {**first["entity"], "name": "Stale name", "_expected_revision": first["revision"]})
    assert error.value.status_code == 409
    assert map_file.read_bytes() == before
    assert "_expected_revision" not in yaml.safe_load(before)
    api.update_entity("review-map", {**saved["entity"], "details": "Fresh edit", "_expected_revision": saved["revision"]})
    assert api.get_entity("review-map")["entity"]["name"] == "Newer name"


def test_two_simultaneous_writers_cannot_both_use_one_revision(map_file: Path) -> None:
    original = api.get_entity("review-map")

    def write(name: str) -> int:
        try:
            api.update_entity("review-map", {**original["entity"], "name": name, "_expected_revision": original["revision"]})
            return 200
        except HTTPException as error:
            return error.status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(write, ["First", "Second"])) == [200, 409]


def test_existing_clients_can_still_save_without_a_revision(map_file: Path) -> None:
    entity = api.get_entity("review-map")["entity"]
    api.update_entity("review-map", {**entity, "details": "Legacy client"})
    assert api.get_entity("review-map")["entity"]["details"] == "Legacy client"
