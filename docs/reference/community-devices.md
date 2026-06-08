---
title: Community Devices
description:
  Run the EspControl web configurator on an unsupported screen by declaring its
  layout in your own device package — no fork of the core repo required.
---

# Community Devices

EspControl ships built-in support for a fixed set of [screens](/screens/jc1060p470).
Adding a brand-new screen to the core project is intentionally limited — every
supported device has to be tested against the whole range. This page is the
self-serve path: it lets you run the configurator UI on a screen we don't ship,
by **declaring the layout in your own ESPHome package** instead of editing the
core `www.js`.

::: tip What this covers
This page is about the **web configurator** — the grid/preview UI served at the
device's IP. Getting EspControl's *firmware* (LVGL pages, fonts, display driver)
running on new hardware is a separate, larger job; see
[Manual ESPHome Setup](/getting-started/manual-esphome-setup) and the
[developer guide](https://github.com/jtenniswood/espcontrol/blob/main/DEVELOPERS.md).
:::

## How device layout is delivered

The configurator JavaScript is **device-agnostic**. The only per-device part is a
small `CFG` object — grid dimensions, button sizing, screen aspect ratio, badge
positions — that the firmware's web server loads at boot.

For built-in devices, that `CFG` is baked into a per-device bundle and served from
jsDelivr:

```yaml
# common/device/core_infra.yaml (built-in devices)
web_server:
  js_url: https://cdn.jsdelivr.net/gh/jtenniswood/espcontrol@main/docs/public/webserver/${device_slug}/www.js
```

A community device instead loads the **generic bundle** and supplies its own
`CFG` at runtime. The bundle deep-merges your config over its defaults, so you
only declare the keys that differ:

```
docs/public/webserver/_generic/www.js
```

The generic bundle reads two optional globals **before it initialises**:

| Global | Purpose |
|---|---|
| `window.ESPCONTROL_CFG` | Your layout. Deep-merged over the generic defaults. |
| `window.ESPCONTROL_DEVICE_ID` | A stable id for your device. Used for backup "same device" matching and the OTA filename. |

## The loader shim

`web_server.js_url` points at a single JavaScript file, so the mechanism is a tiny
**loader shim**: a few lines that set the globals and then pull in the generic
bundle. Host it anywhere the device can reach over HTTPS — your own GitHub repo
via jsDelivr is the simplest:

```js
// my-panel-ui.js  (hosted in YOUR repo)
window.ESPCONTROL_DEVICE_ID = "my-community-panel";
window.ESPCONTROL_CFG = {
  slots: 6,
  cols: 3,
  rows: 2,
  screen: { width: "100%", aspect: "800/480" },
  // ...only the keys that differ from the generic defaults
};
var s = document.createElement("script");
s.src = "https://cdn.jsdelivr.net/gh/jtenniswood/espcontrol@main/docs/public/webserver/_generic/www.js";
document.head.appendChild(s);
```

Point your device at the shim by overriding `js_url` in your package's
`substitutions`/`web_server` block:

```yaml
web_server:
  js_url: https://cdn.jsdelivr.net/gh/<you>/<your-repo>@main/my-panel-ui.js
```

::: warning jsDelivr caching
jsDelivr caches `@main` aggressively (up to ~12 hours). While iterating, pin a
commit hash or tag (`@<sha>`) and add a cache-buster query
(`?v=1`), or serve the shim from the device/another host. Built-in bundles use
`?v=${firmware_version}` for exactly this reason.
:::

## Configuration reference

Everything except `slots`, `cols`, and `rows` has a built-in fallback, so a
minimal `CFG` is just those three plus a `screen`. All sizes are in container
query units (`cqw`) unless noted.

| Key | Type | Meaning |
|---|---|---|
| `slots` | number | Total button slots (must match the firmware grid). **Required.** |
| `cols` / `rows` | number | Landscape grid dimensions. **Required.** |
| `screen` | `{ width, aspect }` | Preview frame: `width` like `"100%"`, `aspect` like `"800/480"`. |
| `portrait` | `{ cols, rows, screen }` | Optional portrait override, used under 90°/270° rotation. |
| `dragMode` | `"swap"` \| `"displace"` | Drag-and-drop reordering behaviour. |
| `dragAnimation` | boolean | Animate drag reflow. |
| `topbar` | `{ height, padding, fontSize }` | Status bar above the grid. |
| `grid` | `{ top, compactTop, left, right, bottom, gap, fr }` | Grid insets, gap, and column track sizing. |
| `btn` | `{ radius, padding, iconSize, labelSize, labelLines, labelLinesDouble }` | Button face sizing. |
| `emptyCell` | `{ radius }` | Corner radius for empty slots. |
| `sensorBadge` | `{ top, right, fontSize }` | Sensor value badge placement. |
| `subpageBadge` | `{ bottom, right, fontSize }` | Subpage chevron badge placement. |
| `largeSensorUnitOffsetPercent` | number | Vertical nudge for large-sensor units. |
| `imageCardLimit` | number | Max simultaneous image-card downloads. |
| `disabledCardTypes` | string[] | Card types to hide (e.g. `["subpage"]`). |
| `infoOnly` | boolean | Treat the panel as display-only (no controls). |
| `timezoneOptions` | string[] | World-clock timezone list. Inherited from the generic bundle — usually omit. |
| `features` | object | Capability flags (e.g. `screenRotation`). See below. |

### Features

`features` advertises optional capabilities the firmware supports:

```js
features: {
  screenRotation: true,
  screenRotationOptions: ["0", "90", "180", "270"],
  screenRotationDefault: "0",
  internalRelays: [/* relay descriptors */],
}
```

The simplest, most-supported starting point is to copy the `web` block of the
closest built-in device from
[`devices/manifest.json`](https://github.com/jtenniswood/espcontrol/blob/main/devices/manifest.json)
and adjust `slots`, `cols`, `rows`, and `screen` to your hardware.

## Caveats

- **Firmware grid must match.** `slots`/`cols`/`rows` describe the *web preview*.
  Your device's LVGL grid (the `btn_N` packages and `lvgl.yaml`) must define the
  same slot count, or the preview and the physical screen will disagree.
- **OTA updates are independent.** `ESPCONTROL_DEVICE_ID` sets the OTA filename,
  but the firmware update manifest is still resolved against the core project's
  hosting. Community firmware needs its own update strategy.
- **No core PR required.** Nothing here touches `devices/manifest.json` or the
  core bundles — your layout lives entirely in your package.

## How it works internally

If you're hacking on the core project, the override is wired in
`src/webserver/entry.js` (deep-merge of `window.ESPCONTROL_CFG` over the baked
`CFG`), the generic bundle is emitted by `generic_web_config()` in
`scripts/build.py`, and the behaviour is locked down by
`scripts/check_community_device_override.js`.
