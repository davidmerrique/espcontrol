#!/usr/bin/env node
"use strict";

// Verifies the community-device runtime override: a device package may declare
// its own screen layout by setting window.ESPCONTROL_CFG (and optionally
// window.ESPCONTROL_DEVICE_ID) before the web bundle loads. The bundle deep
// merges that config over the baked defaults. See docs/reference/community-devices.md.

const assert = require("assert");
const path = require("path");
const vm = require("vm");
const { loadBundledWebSource } = require("./web_source");

const SOURCE = path.join(__dirname, "..", "src", "webserver", "entry.js");

function loadResolvedConfig(overrides) {
  const sandbox = {
    __ESPCONTROL_TEST_HOOKS__: {},
    console: { log() {}, warn() {}, error() {} },
    setTimeout,
    clearTimeout,
    requestAnimationFrame(fn) { return setTimeout(fn, 0); },
    document: {
      readyState: "loading",
      activeElement: null,
      addEventListener() {},
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  // The package-supplied globals must exist before the bundle evaluates.
  if (overrides && overrides.cfg !== undefined) sandbox.ESPCONTROL_CFG = overrides.cfg;
  if (overrides && overrides.deviceId !== undefined) sandbox.ESPCONTROL_DEVICE_ID = overrides.deviceId;
  vm.createContext(sandbox);
  vm.runInContext(loadBundledWebSource(), sandbox, { filename: SOURCE });
  const hooks = sandbox.__ESPCONTROL_TEST_HOOKS__.config;
  assert(hooks && typeof hooks.resolvedDeviceConfig === "function", "resolvedDeviceConfig hook is exported");
  return hooks.resolvedDeviceConfig();
}

// Baseline: with no override, the baked defaults are used unchanged.
const baseline = loadResolvedConfig(null);
assert(baseline.slots > 0, "baked config exposes a slot count");
assert(baseline.cols > 0 && baseline.rows > 0, "baked config exposes a grid");
assert.strictEqual(typeof baseline.deviceId, "string", "baked config exposes a device id");
const bakedDragMode = baseline.cfg.dragMode;
const bakedScreenWidth = baseline.cfg.screen && baseline.cfg.screen.width;
const bakedBtnRadius = baseline.cfg.btn && baseline.cfg.btn.radius;
const bakedTopbar = JSON.stringify(baseline.cfg.topbar);

// Override: a community package declares only what differs.
const resolved = loadResolvedConfig({
  deviceId: "community-test-panel",
  cfg: {
    slots: 6,
    cols: 3,
    rows: 2,
    screen: { aspect: "800/480" },
    btn: { iconSize: 9.5 },
  },
});

// Top-level overrides win and feed the captured grid constants.
assert.strictEqual(resolved.deviceId, "community-test-panel", "device id override applies");
assert.strictEqual(resolved.slots, 6, "slots override feeds NUM_SLOTS");
assert.strictEqual(resolved.cols, 3, "cols override feeds GRID_COLS");
assert.strictEqual(resolved.rows, 2, "rows override feeds GRID_ROWS");

// Nested objects are deep merged: declared keys win, siblings are preserved.
assert.strictEqual(resolved.cfg.screen.aspect, "800/480", "nested screen.aspect override applies");
assert.strictEqual(resolved.cfg.screen.width, bakedScreenWidth, "unspecified screen.width falls back to baked value");
assert.strictEqual(resolved.cfg.btn.iconSize, 9.5, "nested btn.iconSize override applies");
assert.strictEqual(resolved.cfg.btn.radius, bakedBtnRadius, "unspecified btn.radius falls back to baked value");

// Untouched top-level keys are preserved.
assert.strictEqual(resolved.cfg.dragMode, bakedDragMode, "unspecified dragMode falls back to baked value");
assert.strictEqual(JSON.stringify(resolved.cfg.topbar), bakedTopbar, "unspecified topbar block is preserved");

// The baseline must be untouched by a later override (no shared mutation).
const baselineAgain = loadResolvedConfig(null);
assert.strictEqual(baselineAgain.slots, baseline.slots, "override does not mutate baked defaults");

console.log("Community device override checks passed.");
