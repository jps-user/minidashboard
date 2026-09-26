# Installation

MiniDashboard is primarily intended for Docker and lightweight Linux installations.

## Docker

See [Docker](docker.md).

## LXC

See [LXC](lxc.md).

For development, install the Python dependencies:

```bash
python3 -m pip install -r requirements.txt
```

Then run:

```bash
python3 main.py
```

The web interface is available on port `8080`.
