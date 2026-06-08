#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const DEVICE_SLUG = "seeed-sensecap-indicator-d1";
const ENTRY = path.join(ROOT, "src", "webserver", "entry.js");
const MODULES_DIR = path.join(ROOT, "src", "webserver", "modules");
const TYPES_DIR = path.join(ROOT, "src", "webserver", "types");
const MODULE_ORDER = require("./web_modules.json");
const DEVICE_CONFIG = require("../web/device-config.json");
const OUTPUT = path.join(ROOT, "docs", "public", "webserver", DEVICE_SLUG, "www.js");

const checkOnly = process.argv.includes("--check");

function indentChunk(text) {
  return text.trimEnd().split(/\r?\n/).map((line) => (line.trim() ? `  ${line}` : "")).join("\n");
}

function replaceMarkedBlock(source, startTag, endTag, content, required = true) {
  const pattern = new RegExp(
    `(^[^\\n]*${startTag}[^\\n]*\\n)(.*?)(^[^\\n]*${endTag}[^\\n]*$)`,
    "ms",
  );
  const match = source.match(pattern);
  if (!match) {
    if (required) throw new Error(`Missing source markers: ${startTag} / ${endTag}`);
    return source;
  }
  return source.slice(0, match.index + match[1].length) +
    content +
    source.slice(match.index + match[1].length + match[2].length);
}

function loadButtonTypes() {
  if (!fs.existsSync(TYPES_DIR)) return "";
  return fs.readdirSync(TYPES_DIR)
    .filter((name) => name.endsWith(".js"))
    .sort()
    .map((name) => {
      const typePath = path.join(TYPES_DIR, name);
      return `  // --- type: ${path.basename(name, ".js")} ---\n${indentChunk(fs.readFileSync(typePath, "utf8"))}`;
    })
    .join("\n") + "\n";
}

function loadWebModules() {
  return MODULE_ORDER.map((name) => {
    const modulePath = path.join(MODULES_DIR, `${name}.js`);
    if (!fs.existsSync(modulePath)) {
      throw new Error(`Missing web module: ${path.relative(ROOT, modulePath)}`);
    }
    return `  // --- module: ${name} ---\n${indentChunk(fs.readFileSync(modulePath, "utf8"))}`;
  }).join("\n") + "\n";
}

function configBlock() {
  const cfgLines = JSON.stringify(DEVICE_CONFIG, null, 2).split(/\r?\n/);
  const cfgBody = cfgLines.slice(1).map((line) => `  ${line}`).join("\n");
  return `  var DEVICE_ID = "${DEVICE_SLUG}";\n  var CFG = ${cfgLines[0]}\n${cfgBody};\n`;
}

function esbuildCommand() {
  const local = path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "esbuild.cmd" : "esbuild");
  if (fs.existsSync(local)) return local;
  return "esbuild";
}

function buildSource() {
  let source = fs.readFileSync(ENTRY, "utf8");
  source = replaceMarkedBlock(source, "__DEVICE_CONFIG_START__", "__DEVICE_CONFIG_END__", configBlock());
  source = replaceMarkedBlock(source, "__BUTTON_TYPES_START__", "__BUTTON_TYPES_END__", loadButtonTypes(), false);
  source = replaceMarkedBlock(source, "__WEB_MODULES_START__", "__WEB_MODULES_END__", loadWebModules());
  return source;
}

function minify(source) {
  const result = spawnSync(esbuildCommand(), ["--loader=js", "--minify"], {
    input: source,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "esbuild failed");
  }
  return result.stdout;
}

function main() {
  const generated = minify(buildSource());
  const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, "utf8") : null;

  if (current === generated) {
    console.log(`${path.relative(ROOT, OUTPUT)} is up to date.`);
    return;
  }

  if (checkOnly) {
    console.error(`${path.relative(ROOT, OUTPUT)} is out of date. Run npm run build:web.`);
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, generated);
  console.log(`updated ${path.relative(ROOT, OUTPUT)}`);
}

main();
