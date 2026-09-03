# migrate-to-wxt

## Why

The build is maintaining a workaround for its own bundler. `@crxjs/vite-plugin` does not emit content scripts as self-contained bundles: it emits a **loader shim** whose only job is to dynamically import the real chunk out of `web_accessible_resources`. That import breaks whenever Chrome regenerates the dynamic URL, so `src/plugin/updateManifectPlugin.js` — 62 lines lifted verbatim from a crxjs GitHub issue — rewrites `dist/manifest.json` after every build and watches it during dev to force `use_dynamic_url: false`.

The cost is visible in the shipped manifest:

```json
"content_scripts": [{ "js": ["assets/studyTable.js-loader-C_MJ4Zgb.js"] }],
"web_accessible_resources": [{
  "matches": ["https://*.reg.kmitl.ac.th/*"],
  "resources": ["assets/styles-CB15rR02.js", "assets/studyTable.js-DsazI5M3.js",
                "assets/examSchedule.js-CfG_Pgx8.js"],
  "use_dynamic_url": false
}]
```

Every page on `reg.kmitl.ac.th` can fetch the extension's code, purely as a side effect of how the bundler ships content scripts. Nothing about this extension asked for a web-accessible resource.

WXT bundles content scripts as standalone entrypoints. No loader, no `web_accessible_resources`, no post-build patch. It also replaces the hand-maintained `manifest.json`, gives content-script HMR that actually reloads, and adds Firefox builds and store-ready zips at no extra cost.

## What Changes

- Replace `@crxjs/vite-plugin` + hand-written `manifest.json` + `updateManifectPlugin.js` with `wxt` and `@wxt-dev/module-svelte`, configured in `wxt.config.js`.
- Move `src/content/{studyTable,examSchedule}.js` to `src/entrypoints/*.content.js` using `defineContentScript`; the URL `matches` move from the manifest into each entrypoint.
- Move extension icons from `public/` to `src/public/` (WXT serves `<srcDir>/public`).
- Carry `assetsInlineLimit: 32768` into WXT's `vite` hook. This is load-bearing, not cosmetic: it inlines the Prompt `woff2` files as data URIs so PNG export embeds the font.
- Disable WXT's auto-imports (`imports: false`). The project lints with oxlint's anti-slop plugin and writes every import explicitly; implicit globals would fight both.
- Replace `pnpm dev` / `pnpm build` with WXT's equivalents and add `zip`. Keep `pnpm lint` as-is.
- **Behavior, markup, and styling are unchanged.** Same two content scripts on the same two URLs, same components, same scrapers, same `core/boot.js` flow (capture old HTML → inject font → scrape → clear body → mount).
- Out of scope: the shadow-root overlay architecture (its own change — see the spike recorded in `preview/spike-shadow.js`), TypeScript adoption, any visual or UX change, and shipping a Firefox build (the capability arrives with WXT; whether to publish is a separate decision).

## Capabilities

### New Capabilities

None. No user-facing behavior is added.

### Modified Capabilities

None. `study-table-render`, `exam-schedule-render`, `study-table-navigation`, `theme-customize` and `image-export` all describe behavior that must come out of this change **byte-for-byte identical**. This change sets `skip_specs: true`.

## Impact

- `package.json` — `wxt` + `@wxt-dev/module-svelte` replace `@crxjs/vite-plugin`; scripts change. Verified compatible: `wxt@0.21.4` peers `vite ^6.3.4 || ^7 || ^8`, and the project is on Vite 8; `@wxt-dev/module-svelte@2.0.5` peers `svelte >=5`.
- **Deleted**: `manifest.json`, `src/plugin/updateManifectPlugin.js`, `vite.config.js` (root only — `preview/vite.config.js` stays).
- **Added**: `wxt.config.js`, `src/entrypoints/`.
- `src/content/` — removed after its two files move to `src/entrypoints/`.
- `public/` → `src/public/`.
- `src/{core,features,services,shared,assets}` — **untouched**. They are ordinary modules and WXT does not care where they live.
- `preview/` — **untouched**. It is a separate Vite root with its own config and imports from `src/features/*`, never from `src/content/*`, so the entrypoint move cannot reach it. The harness must still run and its scraper sweep still pass after the migration.
- Manifest surface shrinks: `web_accessible_resources` disappears entirely. Worth confirming against the packed build, since that is the clearest single signal the migration worked.
- Risk carried from the spike: WXT's shadow-root helpers inject CSS into a shadow root, where Tailwind v4's `@property` declarations are ignored and border utilities silently degrade. This change does not use them, but the finding belongs with the migration notes so the follow-up change does not rediscover it.
