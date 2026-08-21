"use strict";
const fs = require("node:fs");

/**
 * Extracts the full source text of `function <name>(...) { ... }` from a file,
 * by counting braces from the first `{` until they balance back to zero.
 *
 * Why this exists: this app's js/ files are plain browser <script> files (not
 * CommonJS/ESM modules), and the app initializes Firebase at the top level,
 * so they can't just be require()'d directly in Node without a real Firebase
 * SDK and network access (neither available in this test environment).
 * Pulling out only the specific function bodies we want to test — verbatim
 * from the real files — lets these tests exercise the actual current
 * implementation, not a hand-copied stand-in that could quietly drift out of
 * sync with it.
 */
function extractFunction(filePath, functionName) {
  const src = fs.readFileSync(filePath, "utf8");
  const startMatch = src.match(new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`));
  if (!startMatch) {
    throw new Error(`Could not find function "${functionName}" in ${filePath}`);
  }
  const startIdx = startMatch.index;
  const braceStart = startIdx + startMatch[0].length - 1; // index of the opening {
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
