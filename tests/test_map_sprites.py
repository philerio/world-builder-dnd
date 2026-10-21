import asyncio
import json
from pathlib import Path

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from worldbuilder.api import app as api_module


def make_request(content_type: str, body: bytes) -> Request:
    delivered = False

    async def receive():
        nonlocal delivered
        if delivered:
            return {"type": "http.disconnect"}
        delivered = True
        return {"type": "http.request", "body": body, "more_body": False}

    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/map-sprites",
        "raw_path": b"/map-sprites",
        "query_string": b"",
        "root_path": "",
        "headers": [(b"content-type", content_type.encode())],
        "client": ("127.0.0.1", 1234),
        "server": ("localhost", 8000),
    }
    return Request(scope, receive)


def test_dungeon_sprite_upload_uses_a_separate_library_and_default_size(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(api_module, "MAP_SPRITES_PATH", tmp_path)
    image = b"\x89PNG\r\n\x1a\nsmall test image"

    uploaded = asyncio.run(api_module.upload_map_sprite(make_request("image/png", image), "Skeleton.png"))
    listed = api_module.list_map_sprites()

    assert uploaded["image_path"].startswith("/map-sprites/skeleton_")
    assert uploaded["category"] == "sprite"
    assert uploaded["default_size"] == 56
    assert listed["assets"] == [uploaded]
    assert (tmp_path / Path(uploaded["image_path"]).name).read_bytes() == image


def test_dungeon_sprite_default_size_can_be_saved(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(api_module, "MAP_SPRITES_PATH", tmp_path)
    filename = "skeleton_123456abcdef.png"
    (tmp_path / filename).write_bytes(b"png")

    result = api_module.update_map_sprite_settings(filename, {"default_size": 88})

    assert result == {"image_path": f"/map-sprites/{filename}", "default_size": 88}
    assert json.loads((tmp_path / ".stamp-settings.json").read_text(encoding="utf-8")) == {filename: 88}


def test_dungeon_sprite_upload_rejects_non_png(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(api_module, "MAP_SPRITES_PATH", tmp_path)

    with pytest.raises(HTTPException) as error:
        asyncio.run(api_module.upload_map_sprite(make_request("image/jpeg", b"not a png"), "sprite.jpg"))

    assert error.value.status_code == 415
    assert list(tmp_path.iterdir()) == []
