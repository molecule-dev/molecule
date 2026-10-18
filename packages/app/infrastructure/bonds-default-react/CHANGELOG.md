# @molecule/app-bonds-default-react

## 1.1.3

### Patch Changes

- 4f3b142: The default auth bonds resolve the HTTP client when it is bonded instead of at setup, so a session restored before the HTTP bond exists still sends `Authorization` on the first request.

## 1.1.2

### Patch Changes

- 54ccf7c: The auth docs name the one request a registered gate must exempt: an app whose own session store restores through the bonded HTTP client sends that request with `skipAuthGate: true`, or the gate holds the request it is waiting for. The shipped restore never needs it — it sends its current-user request with `fetch`, so the gate the default auth bonds register cannot hold it.
- 8e3ac7b: The `authScheme` guidance now names the call that takes it: `setClient(createFetchClient({ baseURL, authScheme: 'Token' }))`, the bonded provider's `createAxiosClient({ baseURL, authScheme: 'Token' })`, or the auth client's `createJWTAuthClient({ authScheme: 'Token' })`. It is a CONSTRUCTOR option — "the client config's `authScheme`" read as a property of the client `getClient()` returns, which has no such property.
- bb7e96a: The auth token is sent with a configurable scheme. `createAxiosClient` takes `authScheme` — `Bearer` by default, or what the API expects, e.g. `Token` for an API that reads `Authorization: Token <jwt>`. It is the same option `@molecule/app-http`'s `HttpClientConfig` already declares, so a client config written against the core works unchanged on the Axios bond the scaffold wires. `createDefaultHttpClientWithAuthBearer` takes `authScheme` too.

## 1.1.1

### Patch Changes

- c3943ab: An HTTP request made while the session is still being restored now waits for that restore instead of being sent without credentials, so a page that fetches viewer-dependent data on mount — a profile's `following` flag, a feed, a `favorited` state — cannot answer for an anonymous viewer on a connection slow enough for the restore to lose the race. `@molecule/app-http` and `@molecule/app-http-axios` await a registered gate before every request (`setAuthGate` / `awaitAuthGate`); `@molecule/app-auth`'s client exposes `whenRestored()`, which resolves once the `initialize()` restore has settled and immediately when none is in flight; the default auth bonds register it, and an app with its own session module registers its own.

## 1.1.0

### Minor Changes

- 7b77ed5: `setupAllDefaultBonds()` now bonds a state provider, and `<MoleculeProvider>` supplies the React state context from it, so `createStore()` + `useStore()` work in a scaffolded app without wiring a state bond or passing a `state` prop; `@molecule/app-state`'s Quick Start no longer creates a store at module scope, where it would throw before the providers are set up.

## 1.0.5

### Patch Changes

- d2d82c2: Optional `setupAppClientSearchMinisearch()` wiring helper.

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
