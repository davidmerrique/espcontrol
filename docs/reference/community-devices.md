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

- Screen-specific ESPHome files for the panel, touch driver, fonts, layout
  profile, and grid wiring.

The expected repository shape is:

```text
device/
  device.yaml
  fonts.yaml
  sensors.yaml
  web_profile.yaml
```

The repository does not need a wrapper package, shared EspControl files,
EspControl release manifests, or automatic updates. ESPHome OTA is still
available after the first successful install.

## Web Setup Page

`device/web_profile.yaml` owns the layout for the screen. It provides the
firmware grid substitutions used by the shared LVGL page and publishes the
internal `Device Profile` text sensor used by EspControl's shared web app. That
profile controls the card count, grid shape, preview sizing, rotation options,
and other layout details.

## Manual Install Example

Replace the repository URL with the community maintainer's repository:

```yaml
substitutions:
  name: "espcontrol-community"
  friendly_name: "EspControl Community"
  community_device_repo: "https://github.com/example/espcontrol-community-device/"
  community_device_ref: "main"

wifi:
  ssid: !secret wifi_ssid
  password: !secret wifi_password

packages:
  espcontrol_community:
    url: https://github.com/jtenniswood/espcontrol/
    file: community/device.yaml
    ref: main
    refresh: 1d
```

Install by USB for the first flash. Later installs can normally use ESPHome OTA
if the display is online.
