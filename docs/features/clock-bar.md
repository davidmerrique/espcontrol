---
title: EspControl Clock Bar
description:
  How to configure the clock bar shown at the top of your EspControl panel.
---

# Clock Bar

The clock bar is the narrow status area at the top of the panel. It uses a fixed layout: one temperature reading on the left, the current time in the middle, and the connectivity icon on the right.

You will find these controls in **Settings > Display > Clock Bar** on the panel web page.

## Settings

- **Show Clock Bar** - turns the whole top bar on or off.
- **Temperature** - shows one Home Assistant temperature sensor as a small clock-bar item.
- **Show Degree Symbol** - controls whether temperature values include the degree/unit suffix.
- **Connectivity** - always shows WiFi strength or Ethernet status at the right edge of the clock bar.

The clock bar layout is not customizable. Extra saved temperature entries, weather settings, and older saved layout strings are ignored by current firmware.

Tap the network status icon on the panel to see device details, including the device name, IP address, WiFi strength, uptime, and firmware version.

The time format and timezone are configured separately in [Time Settings](/features/clock). The temperature unit is configured in [Temperature Settings](/features/temperature).
