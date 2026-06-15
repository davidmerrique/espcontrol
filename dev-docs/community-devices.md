# Community Device Packages

Community device packages let unofficial screen repositories compose with the
shared EspControl firmware and web app without adding those screens to
`devices/manifest.json`, generated install manifests, or release builds.

## Scope

Use this path when a screen is maintained outside this repository and does not
need browser install support or EspControl-managed auto updates.

Do not use this path for officially supported screens. Official screens still go
through `devices/manifest.json`, generated web bundles, release manifests, and
firmware compile checks.

## Contract

A community repository owns only screen-specific files. The user-facing entry
point stays in this repository at `community/device.yaml`; user configs pass the
community repo URL through `community_device_repo`.

The community repository should provide:

- `device/device.yaml` for hardware, display, touch, backlight, and OTA hooks.
- `device/fonts.yaml` for the screen's font roles and sizes.
- `device/sensors.yaml` for grid wiring and Home Assistant subscriptions.
- `device/web_profile.yaml` for firmware grid layout substitutions and the
  browser setup page layout profile.

It should not copy shared EspControl packages or point at EspControl firmware
manifests. `community/device.yaml` disables EspControl-managed firmware updates
and uses `common/addon/firmware_update_disabled.yaml`; ESPHome OTA stays
available.

## Supported Overrides

Official and community devices use the same decentralized profile contract. The
shared web app loads the internal `Device Profile` text sensor before it
renders, and the shared community LVGL grid reads the same file's substitutions
for panel-specific positions and grid dimensions. Official profile files are
generated under `devices/<slug>/device/web_profile.yaml`; community repositories
author their own `device/web_profile.yaml`.

## Manual Install Shape

End users should install community devices from ESPHome with a local file like:

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

The community repository should document which screen revision it targets and
which EspControl commit or release it has been tested against.
