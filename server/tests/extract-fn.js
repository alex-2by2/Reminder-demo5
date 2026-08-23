"use strict";
const fs = require("node:fs");

/**
 * Extracts the full source text of `function <name>(...) { ... }` from a
 * file, by counting braces from the first `{` until they balance to zero.
 *
 * Why this exists: public/admin.js is a plain browser <script> file (it
 * references `document`, `fetch`, `firebase`, etc. at the top level), so it
 * can't be require()'d directly in Node — it would throw immediately. This
 * pulls out only the one function we actually want to unit-test (esc()),
 * verbatim from the real file, so the test exercises the current
 * implementation rather than a hand-copied stand-in that could drift out of
 * sync with it.
 *
 * This is the same utility, doing the same job, as the main app's
 * tests/extract-fn.js — copied rather than required across the server/
 * boundary so this server folder stays fully self-contained.
 */
function extractFunction(filePath, functionName) {
  const src = fs.readFileSync(filePath, "utf8");
  const startMatch = src.match(new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`));
  if (!startMatch) {
    throw new Error(`Could not find function "${functionName}" in ${filePath}`);
  }
  const startIdx = startMatch.index;
  const braceStart = startIdx + startMatch[0].length - 1;
  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        return src.slice(startIdx, i + 1);
      }
    }
  }
  throw new Error(`Unbalanced braces while extracting "${functionName}" from ${filePath}`);
}

module.exports = { extractFunction };
