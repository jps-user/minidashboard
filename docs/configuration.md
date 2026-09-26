# Configuration

MiniDashboard stores its configuration as `config.json` in the persistent data directory.

The file is created automatically when the application first saves configuration.

The top-level properties are:

- `title`: dashboard title
- `showUrls`: whether tile URLs are displayed
- `groups`: ordered list of dashboard groups

Each group contains:

- `id`: unique group identifier
- `name`: group name
- `tiles`: ordered list of tiles

Each tile contains:

- `id`: unique tile identifier
- `title`: displayed tile title
- `url`: destination URL
- `icon`: icon name

The easiest way to configure the dashboard is through the web interface.

## Light and dark icon variants

When an icon source provides separate light and dark variants, MiniDashboard stores both variants locally and switches between them when the dashboard theme changes.

If an icon does not switch correctly between light and dark mode, fetch the icon again and reload the browser page.
