---
title: Community Devices
description:
  How unofficial EspControl screen packages can be used from ESPHome without joining the official release and update pipeline.
---

# Community Devices

Community devices are unofficial ESPHome packages for screens that are not
tested as part of EspControl releases. They are installed manually from ESPHome
and maintained in a separate GitHub repository.

Use this route only if a community maintainer has provided a package for your
exact screen.

## What the Community Repository Provides

A community device repository should provide:

- A `packages.yaml` entry point.
- Screen-specific ESPHome files for the panel, touch driver, fonts, LVGL layout,
  and grid wiring.
- References to shared EspControl packages from
  `https://github.com/jtenniswood/espcontrol/`.
- `disable_updates: "true"` so the display does not use EspControl's official
  firmware update manifests.

The repository does not need to provide EspControl release manifests or automatic
updates. ESPHome OTA is still available after the first successful install.

## Web Setup Page

The built-in setup page needs a web profile that matches the screen layout. A
community package can either:

- Reuse an existing EspControl profile if the screen has the same card count,
  orientation, and layout behavior.
- Set `web_server_js_url` to a compatible setup-page bundle hosted by the
  community project.

If neither of those is true, the firmware may boot, but the setup page can show
the wrong number of cards or the wrong preview layout.

## Manual Install Example

Replace the repository URL with the community maintainer's repository:

```yaml
substitutions:
  name: "espcontrol-community"
  friendly_name: "EspControl Community"
  disable_updates: "true"

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

packages:
  setup:
    url: https://github.com/example/espcontrol-community-device/
    file: packages.yaml
    ref: main
    refresh: 1d
```

Install by USB for the first flash. Later installs can normally use ESPHome OTA
if the display is online.
