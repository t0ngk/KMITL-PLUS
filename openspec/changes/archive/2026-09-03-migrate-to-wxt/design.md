# Design — migrate-to-wxt

## Context

See proposal.md for motivation. Current state that shapes the approach:

- Build is `vite.config.js` with four plugins: `svelte()`, `tailwindcss()`, `crx({ manifest })`, `updateManifestPlugin()`. `manifest.json` is hand-written at the repo root and declares the two content scripts and their URL `matches`.
- `build.assetsInlineLimit: 32768` inlines the Prompt `woff2` files as data URIs. `core/boot.js` then injects `fonts.css` as a `<style>` into `document.head`, because CSS Chrome injects through the manifest never appears in `document.styleSheets` and snapdom cannot see `@font-face` there when exporting the PNG. Both halves are load-bearing for image export.
- Each content script is 15–19 lines: import `boot`, a component and a scraper, import `../assets/styles.css`, call `boot({...})`. All real logic lives in `src/{core,features,services,shared}`.
- `preview/` is a **separate Vite root** (`preview/vite.config.js`, its own `index.html`, its own alias mapping `../../services/reg` to `regStub.js`). It imports from `src/features/*`, never from `src/content/*`.
- Lint is oxlint with a local `anti-slop` JS plugin; the project writes every import explicitly and the convention is to never suppress a rule.
- Project is plain JavaScript with a `jsconfig.json`; `checkJs` is on. There is no test framework — verification is walking the app, now backed by the `preview/` harness and its registrar fixtures.
- Chrome MV3, desktop only, two URLs on `*.reg.kmitl.ac.th`.

## Goals / Non-Goals

**Goals:**

- The extension builds and runs with no bundler workaround: no loader shim, no `web_accessible_resources`, no post-build manifest rewrite.
- The manifest becomes derived output rather than a hand-edited file.
- The rendered pages, the exported PNGs, and the scraping behavior are indistinguishable from today's build.
- The `preview/` harness keeps working untouched, and stays the fastest way to verify the migration.

**Non-Goals:**

- No shadow-root overlay, no `createShadowRootUi`. That is a separate change; this one keeps `core/boot.js` clearing the body and mounting into it.
- No TypeScript adoption. WXT works with plain JS; the type-generation niceties are simply left on the table.
- No visual change, no component change, no scraper change.
- Not publishing a Firefox build. WXT makes `wxt build -b firefox` available; whether to ship it is a product decision outside this change.

## Decisions

### 1. Entrypoints replace the hand-written manifest

`src/content/studyTable.js` → `src/entrypoints/studyTable.content.js`, wrapping today's body in `defineContentScript({ matches, main })`. The `matches` patterns move out of `manifest.json` and sit next to the code they gate.

```
   ก่อน                                     หลัง
   manifest.json                            wxt.config.js
     content_scripts[0].js   ----+            manifest: { name, description, icons }
     content_scripts[0].matches  |
   src/content/studyTable.js     +--->      src/entrypoints/studyTable.content.js
     boot({...})                              defineContentScript({ matches, main })
```

- Why: it removes the split-brain where a file's activation condition lives in a different file, and it is the only way WXT discovers content scripts.
- `main()` is where today's `boot({...})` call goes, unchanged. `boot` itself is untouched.
- Alternative (keep `manifest.json` and point WXT at it): WXT can merge a partial manifest, but content scripts declared there would not be built as entrypoints, which is the whole point. Rejected.

### 2. Content-script CSS keeps arriving through the manifest, not a shadow root

Each entrypoint keeps its `import "../assets/styles.css"`, and WXT keeps registering it as a manifest `css` entry for that content script. `cssInjectionMode` is left at its default; `createShadowRootUi` is not used.

- Why: the spike (recorded in `preview/spike-shadow.js`) found that Tailwind v4 leans on `@property --tw-*` declarations for initial values, and `@property`, like `@font-face`, only registers at document level. Injected into a shadow root it is ignored, `--tw-border-style` resolves to nothing, `border-left-style` falls back to `none`, and **every border in the app silently disappears — on screen, not just in the export.** Adopting shadow roots means hoisting those 28 `@property` blocks to `document.head`.
- That is a solvable ~5-line problem, but it is an architecture change, not a build-tool change. Bundling it here would mean that if the migration breaks something, there are two candidate causes.

### 3. `assetsInlineLimit` moves to WXT's `vite` hook, and is verified by a byte check

```js
vite: () => ({ build: { assetsInlineLimit: 32768 } })
```

- Why it cannot be dropped: without it the `woff2` files ship as separate assets referenced by URL. A content script's CSS is fetched by Chrome from an extension URL, so the font would still render — but snapdom embeds fonts by reading them out of the stylesheet, and the PNG export is one of the two primary user tasks in `PRODUCT.md`.
- The failure is silent and only visible in an exported image, so the task list checks the built CSS for `data:font/woff2` directly rather than trusting the config.

### 4. Auto-imports off

`imports: false` in `wxt.config.js`.

- Why: WXT's default injects globals (`defineContentScript`, `browser`, `storage`, …) via unimport. The project lints with a strict local plugin and writes imports explicitly; implicit globals would read as undefined identifiers to a reader and would need per-rule exceptions in oxlint.
- Cost: `defineContentScript` must be imported explicitly in each entrypoint. Two files, two lines.

### 5. ~~`public/` moves under `src/`~~ — wrong premise, reverted during implementation

The claim was that WXT serves `<srcDir>/public`. **It does not.** WXT resolves

```js
publicDir = path.resolve(root, config.publicDir ?? "public")
```

relative to the **project root**, independent of `srcDir`. Moving the icons to `src/public/` produced a build whose manifest still declared all four icons while emitting none of them — a silently icon-less extension.

The icons stay at `public/`, which is already WXT's default. No `publicDir` setting is needed and no file moves. The generated manifest does drop the `public/` prefix from the icon paths (`public/icon-192x192.png` → `icon-192x192.png`), but that is WXT rewriting paths relative to its own output root, not a consequence of moving anything.

Kept as a record rather than deleted: the decision was wrong in a way that produced a working-looking build, and the task that caught it only existed because the decision flagged the risk it was itself creating.

### 5b. Tailwind has no WXT module and must be passed through by hand

`vite: () => ({ plugins: [tailwindcss()] })`.

- Not anticipated in the original design, which only carried `assetsInlineLimit` through the `vite` hook. Svelte arrives via `@wxt-dev/module-svelte`, and it is easy to assume Tailwind has an equivalent. It does not.
- Without it the build still succeeds. It prints `[lightningcss minify] Unknown at rule: @apply` and ships a stylesheet with the `@apply` directives unexpanded — a build that looks fine in the log and is broken in the browser. The 1.1 baseline byte size (25790) is what made it obvious, at 22.50 kB.

### 6. `preview/` is deliberately excluded from the migration

Nothing in `preview/` changes. It keeps its own `vite.config.js` and continues to run under plain `vite`.

- Why it is safe: `preview/main.js` imports `src/features/*` components and scrapers directly. `src/content/` is not on any path it touches, so moving those two files cannot reach it.
- Why it matters: after the migration the harness is the fastest available proof that scraping and rendering did not change — it runs the real scrapers over 37 real registrar pages plus three fixtures without a login. It is used as a verification instrument in the task list, not just left alone.

## Risks / Trade-offs

- [Font stops being inlined and PNG export silently loses Prompt] → Decision 3, plus a task that greps the built CSS for `data:font/woff2` and an export walk in the preview harness.
- [Icons break because their manifest paths changed with the `public/` move] → Decision 5, verified against `.output/`'s manifest and by loading the unpacked extension.
- [WXT's dev-mode content script injection differs from crxjs and hides a problem until a production build] → Every acceptance check runs against a **built** extension loaded unpacked, not against dev mode.
- [Something in `src/` turns out to need editing to satisfy WXT] → The proposal says `src/{core,features,services,shared,assets}` is untouched. If that turns out to be false, stop and surface it rather than absorbing an unplanned code change into a build-tool migration.
- [`checkJs` / editor tooling degrades because `jsconfig.json` does not know about WXT's generated types] → Accepted for this change; the project has no type-checking step in CI and `pnpm lint` is the gate. Revisit if TypeScript is ever adopted.
- [The migration lands while `refactor-exam-ui` and `refactor-study-grid-css-grid` still have open live-verification tasks] → Those two tasks need a logged-in session and a built extension anyway. Sequencing note: doing them on the WXT build satisfies both at once, but if they are walked on the crxjs build first, they must not be re-ticked without re-walking.

## Migration Plan

Single change. Rollback is `git revert` plus `pnpm install`, since the deleted files (`manifest.json`, `updateManifectPlugin.js`, `vite.config.js`) come back with it. Nothing is published, so there is no store-side rollback.

The clearest single signal that the migration worked is negative: `web_accessible_resources` is absent from the built manifest and no loader shim appears in the content-script entry.
