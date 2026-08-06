---
'@molecule/app-bonds-default-react': patch
---

Move the nine optional provider wirings out of the package barrel and behind
`./optional/<pair>.js` subpath exports.

**Import path change** (pre-release: nothing external consumes this yet, so it ships as a patch rather than a major): `setupAppRealtimeSocketio`, `setupAppKeyboardShortcutsHotkeys`,
`setupAppCommandPaletteCmdk`, `setupAppCodeEditorMonaco`,
`setupAppVirtualScrollTanstack`, `setupAppDragDropDndkit`,
`setupAppChartsChartjs`, `setupAppMapsLeaflet` and `setupAppVideoHls` are no
longer exported from the package root. Import each from its own subpath:

```diff
-import { setupAppMapsLeaflet } from '@molecule/app-bonds-default-react'
+import { setupAppMapsLeaflet } from '@molecule/app-bonds-default-react/optional/maps-leaflet.js'
```

**Why.** A bundler must RESOLVE every `import()` in a module it pulls into the
graph, before tree-shaking can drop anything. While these wirings sat in
`setup.ts` — re-exported from the barrel — importing `bootstrapApp` dragged all
18 optional providers in, so any app that had not installed all 18 failed to
build:

```
[vite]: Rolldown failed to resolve import "@molecule/app-maps"
        from ".../app-bonds-default-react/dist/setup.js"
```

A scaffolded `status-page` app installed 3 of the 18; the other 15 were equally
unresolvable and only the alphabetically-first was reported. Declaring them as
optional peers is correct bookkeeping but changes nothing, because npm does not
install optional peers — and installing all 18 would tax every app with Monaco,
Leaflet, Chart.js, Socket.IO and hls.js, which is what making them optional was
for. One module per pair means an app pays for exactly the providers it imports.

Verified end to end: the app that reproduced the failure now builds (2500
modules, 0 unresolved), and all 266 template workspaces type-check clean.
