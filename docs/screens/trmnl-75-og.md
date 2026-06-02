---
title: TRMNL 7.5 OG
description:
  Basic setup for running EspControl on the TRMNL 7.5-inch e-paper display.
---

# TRMNL 7.5 OG

The **TRMNL 7.5 OG** is a 7.5-inch, 800 × 480 monochrome e-paper display powered by an **ESP32-S3**. In EspControl it uses the same card layout system as the other supported devices, with a custom black-and-white theme for the e-paper screen.

## What You Need

- A TRMNL 7.5 OG display.
- A USB-C data cable.
- A computer with Chrome or Edge for the browser installer, or this project checked out locally for command-line flashing.
- A 2.4 GHz WiFi network.
- Home Assistant with the ESPHome integration.

## Card Grid

<!--@include: ../generated/screens/trmnl-75-og-grid.md-->

## Flash the Firmware

For the normal first install, connect the TRMNL to your computer with USB-C, then use the browser installer below.

<!--@include: ../generated/screens/trmnl-75-og-install.md-->

Leave the cable connected until the installer says flashing has finished and the display has restarted.

## Local Project Flash

Use this when developing or testing the current project code directly.

1. Connect the TRMNL by USB-C.
2. Find the serial port. On macOS it usually looks like `/dev/cu.usbmodem...`.
3. Build the factory firmware from the project root:

```sh
docker run --rm -v "$PWD:/config" ghcr.io/esphome/esphome:stable compile /config/builds/trmnl-75-og.factory.yaml
```

4. Flash the generated image, replacing the port if yours is different:

```sh
esptool.py --chip esp32s3 --port /dev/cu.usbmodem2012301 --baud 460800 --before default_reset --after hard_reset write_flash -z 0x0 builds/.esphome/build/trmnl-75-og/.pioenvs/trmnl-75-og/firmware.factory.bin
```

When flashing succeeds, the tool verifies the written data and resets the display.

## First Boot

After flashing, the display starts a WiFi setup access point if it does not already have network details.

1. Join the TRMNL setup WiFi from your phone or computer.
2. Enter your home WiFi details.
3. Wait for the display to reboot and join WiFi.
4. Add the device in **Home Assistant > Settings > Devices & services** when ESPHome discovers it.
5. Open the display web page from Home Assistant or by visiting its IP address in a browser.

## Configure Cards

Use the built-in web page to configure the 12 card slots. The TRMNL preview is black and white to match the e-paper screen.

For weather cards:

- Use a `weather.*` entity.
- Choose **Current Conditions**, **Temperatures Today**, or **Temperatures Tomorrow**.
- For forecast cards, make sure the device is allowed to call Home Assistant actions. Follow [Home Assistant Actions](/getting-started/home-assistant-actions) if forecast values stay as `--/--`.
- Set the temperature unit and timezone in the display settings so forecast values match the web preview.

## Refresh Behaviour

The TRMNL is e-paper, so it does not update like an LCD touchscreen. EspControl batches screen refreshes and refreshes when card configuration or Home Assistant card data changes. There is also a **Refresh Display** control exposed in Home Assistant for a manual refresh.

## Troubleshooting

- **No setup WiFi appears:** try a different USB-C data cable, then re-flash the factory firmware.
- **Display is online but cards do not update:** check that the ESPHome integration is connected in Home Assistant.
- **Forecast cards show `--/--`:** enable Home Assistant actions for the ESPHome device and confirm the selected weather entity provides daily forecasts.
- **The screen looks stale:** use the **Refresh Display** control in Home Assistant.
- **USB flashing cannot find the device:** unplug and reconnect the TRMNL, then check the serial port again.

For the general install walkthrough, see the [Install guide](/getting-started/install). For manual ESPHome package setup, see [Manual ESPHome Setup](/getting-started/manual-esphome-setup).
