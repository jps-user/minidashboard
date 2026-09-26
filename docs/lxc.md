# LXC

MiniDashboard can run directly in a lightweight Debian LXC without Docker.

## Requirements

- Debian-based Linux container
- Python 3
- systemd
- Network access to the systems you want to manage

No database or additional application server is required.

## Installation

Create a dedicated directory:

mkdir -p /opt/minidashboard
cd /opt/minidashboard

Copy the MiniDashboard application files into this directory.

Install the required Python packages:

python3 -m pip install -r requirements.txt

If the distribution does not provide pip, install it first using the distribution's package manager.

Create the persistent data directory:

mkdir -p /var/lib/minidashboard

Start MiniDashboard for a first test:

cd /opt/minidashboard
DATA_DIR=/var/lib/minidashboard python3 main.py

The web interface is available on:

http://YOUR-LXC-IP:8080

Stop the test process with Ctrl+C.

## systemd service

For normal operation, run MiniDashboard as a systemd service.

Create:

/etc/systemd/system/minidashboard.service

with the following content:

[Unit]
Description=MiniDashboard
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/minidashboard
Environment=DATA_DIR=/var/lib/minidashboard
ExecStart=/usr/bin/python3 /opt/minidashboard/main.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target

Reload systemd:

systemctl daemon-reload

Enable and start the service:

systemctl enable --now minidashboard

Check the service:

systemctl status minidashboard

The web interface is then available on:

http://YOUR-LXC-IP:8080

## Persistent data

The application itself is stored in:

/opt/minidashboard

Persistent runtime data is stored separately in:

/var/lib/minidashboard

This includes:

/var/lib/minidashboard/config.json
/var/lib/minidashboard/icons/
/var/lib/minidashboard/icon_variants.json

Keeping the data directory separate allows the application files to be replaced during updates without overwriting the dashboard configuration or downloaded icons.

## Updating

Stop MiniDashboard:

systemctl stop minidashboard

Replace the application files in:

/opt/minidashboard

The persistent data in:

/var/lib/minidashboard

should not be removed.

Start MiniDashboard again:

systemctl start minidashboard

Check the service:

systemctl status minidashboard

## Logs

View the service log with:

journalctl -u minidashboard

Follow the log:

journalctl -u minidashboard -f

## Network access

MiniDashboard listens on TCP port 8080.

If the LXC uses a host firewall or an external firewall, allow access to this port from the networks that should be able to access the dashboard.

MiniDashboard does not provide authentication or authorization. It should therefore normally be used only on a trusted network or behind an appropriate authentication layer.
