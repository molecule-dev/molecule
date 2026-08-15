# @molecule/app-bonds-default-react

## 1.0.3

### Patch Changes

- Auth http-token sync now mirrors a null access token to the http client, so cookie-session logins can no longer keep authenticating with a stale bearer from the prior session.

## 1.0.2

### Patch Changes

- 19b6ead: Move the nine optional provider wirings out of the package barrel and behind
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

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/app-auth@1.0.1
  - @molecule/app-charts-chartjs@1.0.1
  - @molecule/app-code-editor@1.0.1
  - @molecule/app-code-editor-monaco@1.0.1
  - @molecule/app-command-palette@1.0.1
  - @molecule/app-command-palette-cmdk@1.0.1
  - @molecule/app-drag-drop@1.0.1
  - @molecule/app-drag-drop-dndkit@1.0.1
  - @molecule/app-fonts@1.0.1
  - @molecule/app-fonts-arimo@1.0.1
  - @molecule/app-http@1.0.1
  - @molecule/app-icons@1.0.1
  - @molecule/app-icons-molecule@1.0.1
  - @molecule/app-keyboard-shortcuts@1.0.1
  - @molecule/app-keyboard-shortcuts-hotkeys@1.0.1
  - @molecule/app-maps-leaflet@1.0.1
  - @molecule/app-realtime@1.0.1
  - @molecule/app-realtime-socketio@1.0.1
  - @molecule/app-routing@1.0.1
  - @molecule/app-routing-react-router@1.0.1
  - @molecule/app-storage@1.0.1
  - @molecule/app-storage-localstorage@1.0.1
  - @molecule/app-styling-tailwind@1.0.1
  - @molecule/app-theme@1.0.1
  - @molecule/app-theme-css-variables@1.0.1
  - @molecule/app-ui@1.0.1
  - @molecule/app-ui-tailwind@1.0.1
  - @molecule/app-video-hls@1.0.1
  - @molecule/app-virtual-scroll@1.0.1
  - @molecule/app-virtual-scroll-tanstack@1.0.1
