# Docker

MiniDashboard is designed to run as a single Docker container.

## Requirements

- Docker
- Docker Compose
- Network access to the systems you want to manage

No database or additional application server is required.

## Installation

Create a directory for MiniDashboard:

mkdir -p /opt/minidashboard
cd /opt/minidashboard

Create a directory for persistent data:

mkdir -p data

Create `compose.yaml` with the following content:

services:
  minidashboard:
    image: ghcr.io/jps-user/minidashboard:latest
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    restart: unless-stopped

Start MiniDashboard:

docker compose up -d

Check the container:

docker compose ps

The web interface is available on:

http://YOUR-SERVER-IP:8080

## Persistent data

The container stores persistent application data in:

/app/data

The host directory:

./data

is mounted to this location.

Important files include:

./data/config.json
./data/icons/
./data/icon_variants.json

The configuration and downloaded icons therefore remain available when the container is recreated or updated.

## Updating

Pull the latest image:

docker compose pull

Recreate the container:

docker compose up -d

Check the container:

docker compose ps

The persistent data in `./data` is not removed during the update.

## Logs

View the container log:

docker compose logs minidashboard

Follow the log:

docker compose logs -f minidashboard

## Stopping MiniDashboard

Stop the container:

docker compose stop

Start it again:

docker compose start

To stop and remove the container:

docker compose down

The persistent data in `./data` is not removed by `docker compose down`.

## Network access

MiniDashboard listens on TCP port 8080 inside the container.

The example Compose configuration publishes port 8080 on the Docker host.

If the Docker host uses a firewall, allow access to port 8080 from the networks that should be able to access the dashboard.

MiniDashboard does not provide authentication or authorization. It should therefore normally be used only on a trusted network or behind an appropriate authentication layer.
