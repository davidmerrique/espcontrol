#!/usr/bin/env node
"use strict";

// Verifies the community-device runtime override: a device package may declare
// its own screen layout by setting window.ESPCONTROL_CFG (and optionally
// window.ESPCONTROL_DEVICE_ID) before the web bundle loads. The bundle deep
// merges that config over the baked defaults. See docs/reference/community-devices.md.

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { loadBundledWebSource } = require("./web_source");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "src", "webserver", "entry.js");
const GENERIC_BUNDLE = path.join(ROOT, "docs", "public", "webserver", "_generic", "www.js");

// Evaluate a web bundle in a minimal sandbox and return its resolved device
// config. Any package-supplied globals must exist before the bundle evaluates.
function evalBundle(sourceText, filename, overrides) {
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
  if (overrides && overrides.cfg !== undefined) sandbox.ESPCONTROL_CFG = overrides.cfg;
  if (overrides && overrides.deviceId !== undefined) sandbox.ESPCONTROL_DEVICE_ID = overrides.deviceId;
  vm.createContext(sandbox);
  vm.runInContext(sourceText, sandbox, { filename });
  const hooks = sandbox.__ESPCONTROL_TEST_HOOKS__.config;
  assert(hooks && typeof hooks.resolvedDeviceConfig === "function", `${filename}: resolvedDeviceConfig hook is exported`);
  return hooks.resolvedDeviceConfig();
}

function loadSourceConfig(overrides) {
  return evalBundle(loadBundledWebSource(), SOURCE, overrides);
}

// ---------------------------------------------------------------------------
// 1. Deep-merge behaviour (against the source template's baked device config)
// ---------------------------------------------------------------------------

// Baseline: with no override, the baked defaults are used unchanged.
const baseline = loadSourceConfig(null);
assert(baseline.slots > 0, "baked config exposes a slot count");
assert(baseline.cols > 0 && baseline.rows > 0, "baked config exposes a grid");
assert.strictEqual(typeof baseline.deviceId, "string", "baked config exposes a device id");
const bakedDragMode = baseline.cfg.dragMode;
const bakedScreenWidth = baseline.cfg.screen && baseline.cfg.screen.width;
const bakedBtnRadius = baseline.cfg.btn && baseline.cfg.btn.radius;
const bakedTopbar = JSON.stringify(baseline.cfg.topbar);

// Override: a community package declares only what differs.
const resolved = loadSourceConfig({
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
const baselineAgain = loadSourceConfig(null);
assert.strictEqual(baselineAgain.slots, baseline.slots, "override does not mutate baked defaults");

// A non-plain-object global must be ignored rather than clobbering CFG.
for (const bad of ['{"slots":1}', [1, 2, 3], 42, true]) {
  const guarded = loadSourceConfig({ cfg: bad });
  assert.strictEqual(guarded.slots, baseline.slots, `non-object ESPCONTROL_CFG (${typeof bad}) is ignored`);
}

// ---------------------------------------------------------------------------
// 2. The shipped generic bundle is renderable and overridable
// ---------------------------------------------------------------------------
// Loads docs/public/webserver/_generic/www.js itself, so a generic config that
// drops a key the UI reads without a fallback (e.g. grid.fr, screen.aspect) is
// caught here rather than by a community user.

assert(fs.existsSync(GENERIC_BUNDLE), `generic bundle missing: run 'python3 scripts/build.py www' (${GENERIC_BUNDLE})`);
const genericSource = fs.readFileSync(GENERIC_BUNDLE, "utf8");

const generic = evalBundle(genericSource, GENERIC_BUNDLE, null);
assert(generic.slots > 0, "generic bundle exposes a positive slot count");
assert(generic.cols > 0 && generic.rows > 0, "generic bundle exposes a grid");
// Keys the UI dereferences without a fallback must be present in the base.
assert(generic.cfg.screen && typeof generic.cfg.screen.aspect === "string", "generic screen.aspect is present");
assert(generic.cfg.grid && generic.cfg.grid.fr != null, "generic grid.fr is present");
assert(generic.cfg.dragMode != null, "generic dragMode is present");
assert(Array.isArray(generic.cfg.timezoneOptions) && generic.cfg.timezoneOptions.length > 0, "generic bundle carries timezone options");

// A community override applies on top of the real generic bundle, not just the
// source template.
const community = evalBundle(genericSource, GENERIC_BUNDLE, {
  deviceId: "my-community-panel",
  cfg: { slots: 8, cols: 4, rows: 2, screen: { aspect: "1280/720" } },
});
assert.strictEqual(community.deviceId, "my-community-panel", "generic bundle honours device id override");
assert.strictEqual(community.slots, 8, "generic bundle honours slots override");
assert.strictEqual(community.cols, 4, "generic bundle honours cols override");
assert.strictEqual(community.rows, 2, "generic bundle honours rows override");
assert.strictEqual(community.cfg.screen.aspect, "1280/720", "generic bundle honours nested screen override");
// Layout siblings the override did not touch survive the merge.
assert.strictEqual(community.cfg.grid.fr, generic.cfg.grid.fr, "generic grid.fr survives a partial override");

console.log("Community device override checks passed.");
