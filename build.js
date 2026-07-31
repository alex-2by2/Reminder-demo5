#!/usr/bin/env node
"use strict";
/**
 * build.js — optional bundling step. Zero dependencies (no npm install, no
 * network access needed), safe by construction: it only concatenates files
 * in load order and syntax-checks the result — it does NOT minify.
 *
 * Why not minify too: a hand-rolled minifier (regex-stripping comments/
 * whitespace) is a real risk in a codebase this size — a `//` inside a
 * string literal (this app has plenty, e.g. "https://...") or inside a
 * regex is enough to silently corrupt the file, and there's no headless
 * browser in this environment to catch that before it ships. Real
 * minifiers (terser, esbuild) parse a proper AST and don't have this
 * problem, but installing one requires npm/network access this build
 * environment doesn't have. See BUILD.md for the one-line command to run
 * terser yourself once you're somewhere with npm access — this script gets
 * you the bigger win (8 requests -> 1) safely, right now, without it.
 *
 * Usage:  node build.js
 * Output: dist/app.bundle.js, dist/index.html (dist/ mirrors everything
 *         else index.html needs — styles.css, manifest.json, sw.js, icons —
 *         so dist/ is a complete, deployable copy).
 */

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = __dirname;
const JS_DIR = path.join(ROOT, "js");
const DIST_DIR = path.join(ROOT, "dist");

// Exact load order matters (00-foundation must run before 01-core, etc.,
// since later files reference earlier ones' top-level functions/variables
// at call time). This list is the split's 30 files across 9 folders —
// see CHANGELOG.md for how each maps back to the original 8 monolithic files.
const FILES_IN_ORDER = [
  "00-foundation/01-config.js",
  "00-foundation/02-logger.js",
  "00-foundation/03-services.js",
  "01-core/01-bootstrap.js",
  "01-core/02-navigation-auth.js",
  "01-core/03-sync-profile.js",
  "01-core/04-calendar-pomodoro.js",
  "01-core/05-premium-themes.js",
  "02-tasks/01-reminders-utils.js",
  "02-tasks/02-habits.js",
  "02-tasks/03-reminders-core.js",
  "03-wellbeing/01-notifications-projects.js",
  "03-wellbeing/02-mood-sharing.js",
  "03-wellbeing/03-sleep-and-tasks.js",
  "03-wellbeing/04-integrations.js",
  "04-ai-calendar/01-ai-assistant.js",
  "04-ai-calendar/02-calendar-habits.js",
  "04-ai-calendar/03-workspace.js",
  "05-work-finance/01-shifts.js",
  "05-work-finance/02-finance.js",
  "05-work-finance/03-student-journal.js",
  "06-lifestyle/01-life-admin.js",
  "06-lifestyle/02-settings-core.js",
  "06-lifestyle/03-extras.js",
  "06-lifestyle/04-reports-export.js",
  "06-lifestyle/05-health-dashboard.js",
  "06-lifestyle/06-advanced-widgets.js",
  "07-automation/01-rules-notifications.js",
  "07-automation/02-analytics-search.js",
  "07-automation/03-engagement-reports.js",
  "08-khata-family/01-khata.js",
  "08-khata-family/02-more-page.js",
  "08-khata-family/03-family-profile.js",
  "08-khata-family/04-planning.js",
];

function main() {
  fs.mkdirSync(DIST_DIR, { recursive: true });

  let sizeBefore = 0;
  const parts = FILES_IN_ORDER.map((name) => {
    const filePath = path.join(JS_DIR, name);
    const src = fs.readFileSync(filePath, "utf8");
    sizeBefore += Buffer.byteLength(src, "utf8");
    return `// ==== ${name} ====\n${src}`;
  });
  const bundle = parts.join("\n\n");
  const bundlePath = path.join(DIST_DIR, "app.bundle.js");
  fs.writeFileSync(bundlePath, bundle, "utf8");

  // Safety check: fail loudly here rather than ship a broken bundle.
  execFileSync(process.execPath, ["--check", bundlePath]);

  const sizeAfter = Buffer.byteLength(bundle, "utf8");
  console.log(`Bundled ${FILES_IN_ORDER.length} files -> dist/app.bundle.js`);
  console.log(`${(sizeBefore / 1024).toFixed(1)} KB across ${FILES_IN_ORDER.length} requests -> ${(sizeAfter / 1024).toFixed(1)} KB in 1 request (before gzip; concatenation only, no minification)`);

  // Generate a matching index.html: same file, 11 local <script> tags
  // collapsed into 1. Everything else (CDN scripts, CSS, inline scripts,
  // all HTML/CSS) is untouched.
  const indexHtmlPath = path.join(ROOT, "index.html");
  let html = fs.readFileSync(indexHtmlPath, "utf8");
  const scriptTagPattern = /<script src="js\/[\w-]+\/[\w-]+\.js" defer><\/script>\n?/g;
  const matches = html.match(scriptTagPattern) || [];
  if (matches.length !== FILES_IN_ORDER.length) {
    throw new Error(
      `Expected to find ${FILES_IN_ORDER.length} local <script defer> tags in index.html, found ${matches.length}. ` +
      `index.html has likely changed since this script was written — update FILES_IN_ORDER/the regex above rather ` +
      `than trust a partial replace.`
    );
  }
  let replaced = false;
  html = html.replace(scriptTagPattern, () => {
    if (replaced) return ""; // drop the rest, first match becomes the single bundle tag
    replaced = true;
    return '<script src="app.bundle.js" defer></script>\n';
  });
  fs.writeFileSync(path.join(DIST_DIR, "index.html"), html, "utf8");

  // Copy everything else index.html needs so dist/ is deployable as-is.
  for (const name of ["styles.css", "sw.js", "manifest.json"]) {
    const src = path.join(ROOT, name);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(DIST_DIR, name));
  }
  for (const entry of fs.readdirSync(ROOT)) {
    if (/^icon-.*\.(png|svg|ico)$/.test(entry)) {
      fs.copyFileSync(path.join(ROOT, entry), path.join(DIST_DIR, entry));
    }
  }

  console.log(`Generated dist/index.html (1 script tag instead of ${FILES_IN_ORDER.length}) and copied static assets.`);
  console.log("dist/ is a complete, deployable copy — e.g. `firebase deploy` from inside dist/, or point firebase.json's \"public\" at \"dist\".");
}

main();
