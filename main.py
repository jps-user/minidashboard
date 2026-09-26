import json
import logging
import os
import re
import shutil
from pathlib import Path

import requests
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("minidashboard")

app = FastAPI(title="MiniDashboard")

MAX_ICON_SIZE = 2 * 1024 * 1024
VALID_ICON_NAME = re.compile(r"^[a-z0-9][a-z0-9._-]*$")
ICON_SOURCE_URL = os.environ.get(
    "ICON_SOURCE_URL",
    "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg",
).rstrip("/")
ICON_METADATA_URL = os.environ.get(
    "ICON_METADATA_URL",
    "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/meta",
).rstrip("/")

BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "web"
BUNDLED_ICONS_DIR = WEB_DIR / "icons"

DATA_DIR = Path(os.environ.get("DATA_DIR", str(BASE_DIR / "data"))).resolve()
CONFIG_FILE = DATA_DIR / "config.json"
ICONS_DIR = DATA_DIR / "icons"
ICON_VARIANTS_FILE = DATA_DIR / "icon_variants.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)
ICONS_DIR.mkdir(parents=True, exist_ok=True)


def load_icon_variants() -> dict:
    try:
        if ICON_VARIANTS_FILE.exists():
            data = json.loads(ICON_VARIANTS_FILE.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Could not read icon variant metadata: %s", exc)
    return {}


def save_icon_variants(data: dict) -> None:
    temporary_file = ICON_VARIANTS_FILE.with_suffix(".tmp")
    try:
        temporary_file.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        temporary_file.replace(ICON_VARIANTS_FILE)
    except OSError as exc:
        logger.warning("Could not save icon variant metadata: %s", exc)
        temporary_file.unlink(missing_ok=True)


def seed_bundled_icons() -> None:
    """Copy bundled icons into persistent storage when they are missing."""
    try:
        for source in BUNDLED_ICONS_DIR.iterdir():
            if source.is_file() and source.suffix.lower() in {".svg", ".png"}:
                target = ICONS_DIR / source.name
                if not target.exists():
                    shutil.copy2(source, target)
    except OSError as exc:
        logger.warning("Could not seed bundled icons: %s", exc)


seed_bundled_icons()


class Tile(BaseModel):
    id: str
    title: str
    url: str
    icon: str = "default"

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        from urllib.parse import urlparse

        parsed = urlparse(value)

        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Tile URL must use http or https.")

        return value


class Group(BaseModel):
    id: str
    name: str
    tiles: list[Tile] = Field(default_factory=list)


class DashboardConfig(BaseModel):
    title: str = "MiniDashboard"
    showUrls: bool = True
    groups: list[Group] = Field(default_factory=list)


class FetchIconRequest(BaseModel):
    name: str


def default_config() -> dict:
    return {
        "title": "My Homelab",
        "showUrls": True,
        "groups": [
            {
                "id": "infrastructure",
                "name": "Infrastructure",
                "tiles": [
                    {
                        "id": "example-service",
                        "title": "Example Service",
                        "url": "https://example.com",
                        "icon": "proxmox",
                    }
                ],
            }
        ],
    }


def load_config_data() -> dict:
    if not CONFIG_FILE.exists():
        return default_config()

    try:
        with CONFIG_FILE.open("r", encoding="utf-8") as file:
            return json.load(file)
    except json.JSONDecodeError as exc:
        logger.error("Invalid JSON in %s: %s", CONFIG_FILE, exc)
        raise HTTPException(
            status_code=500,
            detail="The configuration file contains invalid JSON.",
        ) from exc
    except OSError as exc:
        logger.error("Could not read %s: %s", CONFIG_FILE, exc)
        raise HTTPException(
            status_code=500,
            detail="The configuration could not be read.",
        ) from exc


def save_config_data(data: dict) -> bool:
    temporary_file = CONFIG_FILE.with_suffix(".json.tmp")

    try:
        with temporary_file.open("w", encoding="utf-8") as file:
            json.dump(data, file, indent=4, ensure_ascii=False)
            file.write("\n")
            file.flush()
            os.fsync(file.fileno())

        temporary_file.replace(CONFIG_FILE)
        return True
    except OSError as exc:
        logger.error("Could not write %s: %s", CONFIG_FILE, exc)
        try:
            temporary_file.unlink(missing_ok=True)
        except OSError:
            pass
        return False


@app.get("/api/config")
def get_config():
    return load_config_data()


@app.post("/api/config")
def save_config(config: DashboardConfig):
    config_dict = config.model_dump()

    if save_config_data(config_dict):
        return {"status": "ok", "config": config_dict}

    raise HTTPException(
        status_code=500,
        detail="The configuration could not be saved.",
    )


@app.get("/api/icons")
def get_icons():
    try:
        stems = {
            file.stem
            for file in ICONS_DIR.iterdir()
            if file.is_file() and file.suffix.lower() in {".svg", ".png"}
        }
        icons = {
            stem for stem in stems
            if not (stem.endswith("-light") and stem[:-6] in stems)
            and not (stem.endswith("-dark") and stem[:-5] in stems)
        }
        return sorted(icons)
    except OSError as exc:
        logger.error("Could not read icon directory: %s", exc)
        return []


@app.get("/api/icons/variants")
def get_icon_variants():
    variants = load_icon_variants()

    try:
        stems = {
            file.stem
            for file in ICONS_DIR.iterdir()
            if file.is_file() and file.suffix.lower() == ".svg"
        }
    except OSError as exc:
        logger.error("Could not read icon directory: %s", exc)
        stems = set()

    for stem in stems:
        if stem.endswith("-light") or stem.endswith("-dark"):
            continue
        entry = variants.setdefault(stem, {})
        entry.setdefault("light", f"{stem}-light" if f"{stem}-light" in stems else stem)
        entry.setdefault("dark", f"{stem}-dark" if f"{stem}-dark" in stems else stem)

    return variants


def download_svg(icon_name: str) -> bool:
    url = f"{ICON_SOURCE_URL}/{icon_name}.svg"
    try:
        with requests.get(url, timeout=5, stream=True) as response:
            if response.status_code != 200:
                return False

            content_type = response.headers.get("Content-Type", "").lower()
            if "image/svg+xml" not in content_type:
                return False

            content_length = response.headers.get("Content-Length")
            if content_length:
                try:
                    if int(content_length) > MAX_ICON_SIZE:
                        raise HTTPException(
                            status_code=413,
                            detail="The icon is larger than 2 MiB.",
                        )
                except ValueError:
                    pass

            file_path = ICONS_DIR / f"{icon_name}.svg"
            temporary_file = ICONS_DIR / f".{icon_name}.svg.tmp"
            downloaded = 0

            try:
                with temporary_file.open("wb") as file:
                    for chunk in response.iter_content(chunk_size=64 * 1024):
                        if not chunk:
                            continue
                        downloaded += len(chunk)
                        if downloaded > MAX_ICON_SIZE:
                            raise HTTPException(
                                status_code=413,
                                detail="The icon is larger than 2 MiB.",
                            )
                        file.write(chunk)
                    file.flush()
                    os.fsync(file.fileno())
                temporary_file.replace(file_path)
            except Exception:
                temporary_file.unlink(missing_ok=True)
                raise

            return True
    except HTTPException:
        raise
    except (requests.RequestException, OSError) as exc:
        logger.warning("Could not download icon %s: %s", icon_name, exc)
        return False


def fetch_icon_metadata(icon_name: str) -> dict:
    url = f"{ICON_METADATA_URL}/{icon_name}.json"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code != 200:
            return {}
        data = response.json()
        colors = data.get("colors", {})
        if not isinstance(colors, dict):
            return {}
        return {"light": colors.get("light"), "dark": colors.get("dark")}
    except (requests.RequestException, ValueError) as exc:
        logger.info("No theme metadata available for %s: %s", icon_name, exc)
        return {}


@app.post("/api/icons/fetch")
def fetch_icon(req: FetchIconRequest):
    icon_name = req.name.strip().lower()

    if not icon_name:
        raise HTTPException(status_code=400, detail="No icon name provided.")

    if not VALID_ICON_NAME.fullmatch(icon_name):
        raise HTTPException(status_code=400, detail="Invalid icon name.")

    metadata = fetch_icon_metadata(icon_name)
    light_name = metadata.get("light") or icon_name
    dark_name = metadata.get("dark") or icon_name

    for variant_name in (light_name, dark_name):
        if not isinstance(variant_name, str) or not VALID_ICON_NAME.fullmatch(variant_name):
            variant_name = icon_name

        if variant_name == light_name:
            light_name = variant_name
        else:
            dark_name = variant_name

    names_to_download = []
    for variant_name in (dark_name, light_name):
        if variant_name and variant_name not in names_to_download:
            names_to_download.append(variant_name)

    downloaded_names = []
    for variant_name in names_to_download:
        if download_svg(variant_name):
            downloaded_names.append(variant_name)

    if icon_name not in downloaded_names and not (ICONS_DIR / f"{icon_name}.svg").exists():
        raise HTTPException(status_code=404, detail="Icon not found.")

    variants = load_icon_variants()
    variants[icon_name] = {
        "light": light_name if (ICONS_DIR / f"{light_name}.svg").exists() else icon_name,
        "dark": dark_name if (ICONS_DIR / f"{dark_name}.svg").exists() else icon_name,
    }
    save_icon_variants(variants)

    return {"status": "ok", "icon": icon_name, "variants": variants[icon_name]}


seed_bundled_icons()


@app.get("/")
def index():
    return FileResponse(WEB_DIR / "index.html")


app.mount("/icons", StaticFiles(directory=ICONS_DIR), name="icons")
app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
