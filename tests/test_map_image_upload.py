import asyncio
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
        "path": "/map-images",
        "raw_path": b"/map-images",
        "query_string": b"",
        "root_path": "",
        "headers": [(b"content-type", content_type.encode())],
        "client": ("127.0.0.1", 1234),
        "server": ("localhost", 8000),
    }
    return Request(scope, receive)


def test_uploaded_map_image_is_saved_as_a_safe_public_asset(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(api_module, "MAP_IMAGES_PATH", tmp_path)
    image = b"\x89PNG\r\n\x1a\nsmall test image"

    result = asyncio.run(
        api_module.upload_map_image(make_request("image/png", image), "../North Hall.png")
    )

    assert result["image_path"].startswith("/maps/north_hall_")
    assert result["image_path"].endswith(".png")
    assert (tmp_path / Path(result["image_path"]).name).read_bytes() == image


def test_map_image_upload_rejects_mismatched_content_type(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(api_module, "MAP_IMAGES_PATH", tmp_path)

    with pytest.raises(HTTPException) as error:
        asyncio.run(
            api_module.upload_map_image(make_request("image/png", b"not a png"), "Map.png")
        )

    assert error.value.status_code == 415
    assert list(tmp_path.iterdir()) == []
