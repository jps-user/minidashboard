# MiniDashboard

A deliberately simple, lightweight dashboard for self-hosted services and homelabs.

MiniDashboard is designed around a few principles:

- **No database**
- **No Node.js**
- **No build system**
- **Simple JSON configuration**
- **Local icons**
- **Easy Docker deployment**
- **LXC-friendly**
- **Small and fast**

If all you need is a clean start page for the services in your homelab, MiniDashboard keeps it simple.

## Features

- Dashboard title
- Groups for organizing services
- Drag and drop groups
- Drag and drop tiles
- Move tiles between groups
- Custom service URLs
- Local SVG and PNG icons
- Fetch icons from a configurable icon source
- Light and dark themes
- Optional URL display
- JSON-based persistent configuration

## Quick start with Docker

Create a directory and a data directory:

```bash
mkdir minidashboard
cd minidashboard
mkdir data
```

Create `compose.yaml` with:

```yaml
services:
  minidashboard:
    image: ghcr.io/jps-user/minidashboard:latest
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

Start it:

```bash
docker compose up -d
```

Open:

```text
http://YOUR-SERVER-IP:8080
```

The configuration is stored in:

```text
./data/config.json
```

## Configuration

MiniDashboard creates a default configuration automatically.

A complete example is provided as:

```text
config.example.json
```

The configuration contains the dashboard title, groups and tiles:

```json
{
    "title": "My Homelab",
    "showUrls": false,
    "groups": [
        {
            "id": "group-1",
            "name": "Infrastructure",
            "tiles": [
                {
                    "id": "tile-1",
                    "title": "Proxmox",
                    "url": "https://192.0.2.10:8006/",
                    "icon": "proxmox"
                }
            ]
        }
    ]
}
```

## Icons

Bundled icons are included with MiniDashboard.

New icons can be fetched from the configured icon source through the web interface. Downloaded icons are stored in the persistent data directory:

```text
data/icons/
```

The default icon source is:

```text
https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg
```

It can be changed with `ICON_SOURCE_URL`.

## Environment variables

Copy `.env.example` to `.env` if you want to customize the environment.

Available settings:

- `ICON_SOURCE_URL` — icon source URL
- `ICON_METADATA_URL` — icon theme metadata URL
- `DATA_DIR` — persistent data directory; defaults to `./data`


### Light and dark icon variants

MiniDashboard keeps fetched icons locally. When the icon source provides separate light/dark variants, both variants are downloaded once and MiniDashboard switches between the local files when the dashboard theme changes. No icon is fetched from the internet during a theme switch.

If an icon does not switch correctly between light and dark mode, fetch the icon again and reload the browser page.

## Security

MiniDashboard is intended for use on a trusted network.

It currently does **not** provide:

- user accounts
- authentication
- authorization
- multi-user management

Do not expose the administration interface directly to the public Internet without placing an appropriate authentication layer in front of it.

## Technology

Backend:

- Python 3
- FastAPI
- Pydantic
- Requests
- Uvicorn

Frontend:

- HTML
- CSS
- Vanilla JavaScript
- Tabler
- Bootstrap
- SortableJS

## Project status

MiniDashboard 0.1.0 is the first public release.

The initial release intentionally focuses on the core dashboard experience rather than adding monitoring, widgets, databases or service-management features.

## License

See `LICENSE`.
