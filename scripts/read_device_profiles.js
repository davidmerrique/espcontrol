"use strict";

// Assemble the { devices: { slug: profile } } structure from the per-device
// devices/<slug>/profile.json files — the JS counterpart to
// device_profiles.load_manifest_data(). There is no central manifest.

const fs = require("fs");
const path = require("path");

const DEVICES_DIR = path.join(__dirname, "..", "devices");
const PROFILE_FILENAME = "profile.json";

function readDeviceManifest(devicesDir = DEVICES_DIR) {
  const devices = {};
  for (const name of fs.readdirSync(devicesDir).sort()) {
    const dir = path.join(devicesDir, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const profilePath = path.join(dir, PROFILE_FILENAME);
    if (!fs.existsSync(profilePath)) continue;
    devices[name] = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  }
  return { devices };
}

module.exports = { readDeviceManifest, DEVICES_DIR };
