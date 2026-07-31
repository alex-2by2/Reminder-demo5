# Build / Bundling

This app has no build step today — `index.html` loads 11 plain `<script>`
files directly, and that still works fine for development (edit a file,
reload, see the change). `build.js` is an **optional** step for production
deploys.

## What it does

```
node build.js
```

Concatenates the 11 JS files (in the exact order `index.html` loads them)
into `dist/app.bundle.js`, syntax-checks the result, generates a matching
`dist/index.html` (same file, 11 `<script>` tags collapsed into 1), and
copies `styles.css`, `sw.js`, `manifest.json`, and the icons alongside it.
`dist/` ends up a complete, deployable copy — e.g. run `firebase deploy`
from inside it, or point `firebase.json`'s `"public"` at `"dist"`.

**What it deliberately does NOT do: minify.** A hand-rolled minifier
(regex-stripping comments/whitespace) is a real risk at this codebase's
size — a `//` inside a string literal (this app has plenty, e.g.
`"https://..."`) or inside a regex is enough to silently corrupt a file,
and there's no headless browser in a CI-less environment to catch that
before it ships. Concatenation alone is a safe, real win on its own
(11 requests → 1); minification is a separate, larger win worth doing with
a real tool.

## Recommended follow-up: real minification

Once you're somewhere with `npm`/network access:

```
npx terser dist/app.bundle.js -c -m -o dist/app.bundle.min.js
```

then point `dist/index.html`'s script tag at `app.bundle.min.js` instead.
Terser parses a real JS AST rather than doing text substitution, so it
doesn't have the string/regex-corruption risk mentioned above.

## Other things worth doing before a production deploy

- Add long-lived `Cache-Control` headers for the bundle (it has no
  versioned filename yet — consider a content hash in the filename, e.g.
  `app.bundle.<hash>.js`, if you add a CDN/cache in front of Firebase
  Hosting).
- The existing `sw.js` already documents its own cache-versioning
  trade-offs — see the comment at the top of that file.
