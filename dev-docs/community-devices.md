# Community Device Packages

Community device packages let unofficial screen repositories compose with
EspControl without adding those screens to `devices/manifest.json`, generated
install manifests, or release builds.

## Scope

Use this path when a screen is maintained outside this repository and does not
need browser install support or EspControl-managed auto updates.

Do not use this path for officially supported screens. Official screens still go
through `devices/manifest.json`, generated web bundles, release manifests, and
firmware compile checks.

## Contract

A community repository owns the hardware-specific package and points ESPHome at
shared EspControl files. Its user-facing entry point should be a single
`packages.yaml` file that the local ESPHome config can load as a remote package.

The community package should:

- Set `disable_updates: "true"` by default, or clearly document that users must
  set it in their local substitutions.
- Provide screen-specific hardware, fonts, LVGL layout, and grid wiring files.
- Reference shared EspControl packages from this repository rather than copying
  generated release artifacts.
- Avoid EspControl firmware manifest URLs, because the official manifests only
  describe officially released binaries.
- Either reuse an existing web setup bundle by setting `device_slug` to a
  compatible profile, or set `web_server_js_url` to a compatible bundle hosted
  by the community repository.

## Supported Overrides

Generated EspControl packages now accept `disable_updates` for all supported
device families. When it is `"true"`, the package uses
`common/addon/firmware_update_disabled.yaml`; ESPHome OTA stays enabled, but the
GitHub firmware update checker and on-screen update controls are omitted.

`common/device/core_infra.yaml` also accepts `web_server_js_url`. Official
devices keep the default generated URL, while community packages can point the
web server at a compatible setup-page bundle.

## Manual Install Shape

End users should install community devices from ESPHome with a local file like:

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

The community repository should document which screen revision it targets and
which EspControl commit or release it has been tested against.
