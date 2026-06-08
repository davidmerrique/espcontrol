#!/usr/bin/env node
"use strict";

// Verifies the runtime device-config mechanism: one generic bundle serves every
// device, and the per-device layout is supplied at load time and deep merged
// over GENERIC_CFG from either window.ESPCONTROL_CFG or the script's own ?cfg=
// (base64url JSON) query — the value the firmware puts in web_server.js_url.

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const BUNDLE = path.join(ROOT, "docs", "public", "webserver", "www.js");

function base64UrlJson(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8")
    .toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Run the built bundle with an optional script src (carrying ?cfg=) and/or an
// explicit window global, then return its resolved device config.
function resolve({ scriptSrc, windowCfg, windowId } = {}) {
  const sandbox = {
    __ESPCONTROL_TEST_HOOKS__: {},
    console: { log() {}, warn() {}, error() {} },
    setTimeout, clearTimeout,
    requestAnimationFrame(fn) { return setTimeout(fn, 0); },
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    Buffer,
    escape, unescape, encodeURIComponent, decodeURIComponent,
    document: {
      readyState: "loading",
      activeElement: null,
      currentScript: scriptSrc ? { src: scriptSrc } : null,
      addEventListener() {},
      getElementsByTagName: () => [],
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  if (windowCfg !== undefined) sandbox.ESPCONTROL_CFG = windowCfg;
  if (windowId !== undefined) sandbox.ESPCONTROL_DEVICE_ID = windowId;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(BUNDLE, "utf8"), sandbox, { filename: BUNDLE });
  const hooks = sandbox.__ESPCONTROL_TEST_HOOKS__.config;
  assert(hooks && typeof hooks.resolvedDeviceConfig === "function", "resolvedDeviceConfig hook is exported");
  // Re-parse in this realm so arrays/objects carry this realm's prototypes
  // (the sandbox builds them in its own realm, which breaks deepStrictEqual).
  return JSON.parse(JSON.stringify(hooks.resolvedDeviceConfig()));
}

assert(fs.existsSync(BUNDLE), `generic bundle missing: run 'python3 scripts/build.py www' (${BUNDLE})`);

// 1. No runtime config → the generic default renders and carries universal data.
const generic = resolve();
assert(generic.slots > 0 && generic.cols > 0 && generic.rows > 0, "generic default exposes a grid");
assert(generic.cfg.screen && typeof generic.cfg.screen.aspect === "string", "generic screen.aspect present");
assert(generic.cfg.grid && generic.cfg.grid.fr != null, "generic grid.fr present");
assert(Array.isArray(generic.cfg.timezoneOptions) && generic.cfg.timezoneOptions.length > 0, "generic carries timezone options");

// 2. window.ESPCONTROL_CFG override (local dev / shim) wins and deep merges.
const viaWindow = resolve({
  windowCfg: { slots: 6, cols: 3, rows: 2, screen: { aspect: "800/480" }, btn: { iconSize: 9.5 } },
  windowId: "via-window-panel",
});
assert.strictEqual(viaWindow.deviceId, "via-window-panel", "window device id applies");
assert.strictEqual(viaWindow.slots, 6, "window slots feed NUM_SLOTS");
assert.strictEqual(viaWindow.cols, 3, "window cols feed GRID_COLS");
assert.strictEqual(viaWindow.cfg.screen.aspect, "800/480", "nested screen override applies");
assert.strictEqual(viaWindow.cfg.screen.width, generic.cfg.screen.width, "unspecified screen.width falls back to generic");
assert.strictEqual(viaWindow.cfg.btn.radius, generic.cfg.btn.radius, "unspecified btn.radius falls back to generic");
assert(Array.isArray(viaWindow.cfg.timezoneOptions) && viaWindow.cfg.timezoneOptions.length > 0, "timezone options inherited from generic");

// 3. ?cfg= base64url query on the script's own src (the firmware js_url path).
const deviceCfg = {
  slots: 8, cols: 4, rows: 2,
  screen: { width: "100%", aspect: "1280/720" },
  features: { screenRotation: true, screenRotationOptions: ["0", "90", "180", "270"] },
};
const src = `https://cdn.example/webserver/www.js?v=1&ui=x&device=my-panel&cfg=${base64UrlJson(deviceCfg)}`;
const viaQuery = resolve({ scriptSrc: src });
assert.strictEqual(viaQuery.deviceId, "my-panel", "query device id applies");
assert.strictEqual(viaQuery.slots, 8, "query slots feed NUM_SLOTS");
assert.strictEqual(viaQuery.cols, 4, "query cols feed GRID_COLS");
assert.strictEqual(viaQuery.rows, 2, "query rows feed GRID_ROWS");
assert.strictEqual(viaQuery.cfg.screen.aspect, "1280/720", "query nested screen override applies");
assert.deepStrictEqual(viaQuery.cfg.features.screenRotationOptions, ["0", "90", "180", "270"], "query features flow through");
assert.strictEqual(viaQuery.cfg.grid.fr, generic.cfg.grid.fr, "query merge preserves generic grid siblings");

// 4. A malformed ?cfg= must fall back to the generic default, not crash.
const viaBadQuery = resolve({ scriptSrc: "https://cdn.example/www.js?device=d&cfg=not-valid-base64-json" });
assert.strictEqual(viaBadQuery.slots, generic.slots, "malformed cfg falls back to generic slots");
assert.strictEqual(viaBadQuery.deviceId, "d", "device id still read from query when cfg is malformed");

// 5. The committed firmware substitutions decode to a renderable config.
const devicesDir = path.join(ROOT, "devices");
let checkedSubs = 0;
for (const name of fs.readdirSync(devicesDir).sort()) {
  const pkg = path.join(devicesDir, name, "packages.yaml");
  if (!fs.existsSync(pkg)) continue;
  const m = fs.readFileSync(pkg, "utf8").match(/web_config_b64:\s*"([A-Za-z0-9_-]+)"/);
  assert(m, `${name}: packages.yaml is missing the web_config_b64 substitution`);
  const realSrc = `https://cdn.example/www.js?device=${name}&cfg=${m[1]}`;
  const resolved = resolve({ scriptSrc: realSrc });
  assert.strictEqual(resolved.deviceId, name, `${name}: device id resolves`);
  assert(resolved.slots > 0 && resolved.cols > 0, `${name}: decoded cfg exposes a grid`);
  assert(resolved.cfg.screen && resolved.cfg.screen.aspect, `${name}: decoded cfg has screen.aspect`);

  // Screen rotation is a per-device capability that now flows through the
  // decoded runtime cfg (previously baked into each bundle).
  const profile = JSON.parse(fs.readFileSync(path.join(devicesDir, name, "profile.json"), "utf8"));
  if (profile.rotation && profile.rotation.enabled) {
    const features = resolved.cfg.features || {};
    assert.strictEqual(features.screenRotation, true, `${name}: decoded cfg must expose screen rotation`);
    assert.deepStrictEqual(features.screenRotationOptions, profile.rotation.options, `${name}: rotation options flow through`);
    assert.strictEqual(features.screenRotationExperimentalOptions, undefined, `${name}: no hidden rotation options`);
  } else {
    assert(!resolved.cfg.features || !resolved.cfg.features.screenRotation, `${name}: no rotation when disabled`);
  }
  checkedSubs += 1;
}
assert(checkedSubs > 0, "expected at least one device packages.yaml with web_config_b64");

console.log(`Runtime device config checks passed (${checkedSubs} device substitutions verified).`);
