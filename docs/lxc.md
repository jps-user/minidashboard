# LXC

MiniDashboard can run directly in a lightweight Debian LXC without Docker.

This guide starts with a fresh Debian LXC and installs MiniDashboard as a systemd service.

## Requirements

- Debian-based LXC
- Python 3
- Git
- systemd
- Network access
- TCP port 8080 available for the dashboard

No database, Node.js installation, or Docker daemon is required.

## Installation

The following example uses:

- Application directory: `/opt/minidashboard`
- Persistent data directory: `/var/lib/minidashboard`
- Web interface: TCP port `8080`

### 1. Install required packages

On a fresh Debian LXC, install Git and the Python environment:

    apt update
    apt install -y git python3 python3-venv

### 2. Download MiniDashboard

Clone the public repository directly into the application directory:

    git clone https://github.com/jps-user/minidashboard.git /opt/minidashboard
    cd /opt/minidashboard

The complete MiniDashboard application, web interface, configuration examples and bundled icons are now available in `/opt/minidashboard`.

### 3. Create the Python environment

Create a dedicated Python virtual environment and install the required packages:

    python3 -m venv /opt/minidashboard/.venv
    /opt/minidashboard/.venv/bin/pip install --upgrade pip
    /opt/minidashboard/.venv/bin/pip install -r /opt/minidashboard/requirements.txt

MiniDashboard runs from this virtual environment so its Python packages remain separate from the Debian system Python installation.

### 4. Create the persistent data directory

Create the directory used for the dashboard configuration and downloaded icons:

    mkdir -p /var/lib/minidashboard

The application files remain in `/opt/minidashboard`.

Persistent runtime data is kept separately in `/var/lib/minidashboard`.

### 5. Test the application manually

Before creating the systemd service, start MiniDashboard manually:

    cd /opt/minidashboard
    DATA_DIR=/var/lib/minidashboard /opt/minidashboard/.venv/bin/python main.py

MiniDashboard listens on TCP port `8080`.

Find the LXC IP address with:

    hostname -I

Then open the dashboard in a browser:

    http://YOUR-LXC-IP:8080

Verify that the dashboard loads correctly.

Stop the test process with `Ctrl+C`.

## systemd service

After the manual test has completed successfully, create a systemd service so MiniDashboard starts automatically with the LXC.

Create the service file:

    nano /etc/systemd/system/minidashboard.service

Enter the following:

    [Unit]
    Description=MiniDashboard
    After=network-online.target
    Wants=network-online.target

    [Service]
    Type=simple
    WorkingDirectory=/opt/minidashboard
    Environment=DATA_DIR=/var/lib/minidashboard
    ExecStart=/opt/minidashboard/.venv/bin/python /opt/minidashboard/main.py
    Restart=always
    RestartSec=3

    [Install]
    WantedBy=multi-user.target

Save the file and reload systemd:

    systemctl daemon-reload

Enable and start MiniDashboard:

    systemctl enable --now minidashboard

Check the service:

    systemctl status minidashboard

A successful installation should show:

    Active: active (running)

The dashboard is now available at:

    http://YOUR-LXC-IP:8080

## Persistent data

The application is installed in:

    /opt/minidashboard

The Python virtual environment is:

    /opt/minidashboard/.venv

Persistent MiniDashboard data is stored in:

    /var/lib/minidashboard

Depending on usage, this directory contains:

    /var/lib/minidashboard/config.json
    /var/lib/minidashboard/icons/
    /var/lib/minidashboard/icon_variants.json

Keeping runtime data separate from the application directory means that updating the application does not replace the dashboard configuration or downloaded icons.

## Updating

MiniDashboard can be updated directly from the GitHub repository.

Stop the service:

    systemctl stop minidashboard

Change to the application directory:

    cd /opt/minidashboard

Download the latest version:

    git pull

Update the Python dependencies:

    /opt/minidashboard/.venv/bin/pip install -r /opt/minidashboard/requirements.txt

Start MiniDashboard again:

    systemctl start minidashboard

Verify the service:

    systemctl status minidashboard

The persistent data in `/var/lib/minidashboard` remains unchanged.

## Logs

Show the MiniDashboard service log:

    journalctl -u minidashboard

Follow the log in real time:

    journalctl -u minidashboard -f

Show the last 100 log entries without opening the pager:

    journalctl -u minidashboard -n 100 --no-pager

## Troubleshooting

Check whether MiniDashboard is listening on port 8080:

    ss -ltnp | grep 8080

Check the systemd service:

    systemctl status minidashboard

If the service failed to start, check the log:

    journalctl -u minidashboard -n 100 --no-pager

After changing the systemd service file, always reload systemd:

    systemctl daemon-reload

Then restart MiniDashboard:

    systemctl restart minidashboard

## Network access

MiniDashboard listens on TCP port `8080`.

If a firewall is used on the LXC, Proxmox host, or network, allow TCP port `8080` from the networks that should access the dashboard.

MiniDashboard does not provide authentication or authorization. It is intended for use on a trusted network or behind an appropriate authentication and access-control layer.

## File layout

After installation, the relevant directories are:

    /opt/minidashboard
    ├── main.py
    ├── requirements.txt
    ├── web/
    └── .venv/

    /var/lib/minidashboard
    ├── config.json
    ├── icon_variants.json
    └── icons/

The application and its persistent data are deliberately kept separate.
