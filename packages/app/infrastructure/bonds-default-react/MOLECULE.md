# @molecule/app-bonds-default-react

`@molecule/app-bonds-default-react` — default app-side bond wirings for the
React fleet stack, replacing the byte-identical per-app files:

- `bootstrapApp({ App, authClient, setupProviders, registerPWA? })` — the
  whole scaffolded `src/main.tsx`: awaits `setupProviders()` BEFORE the
  first render, kicks off `authClient.initialize()` (best-effort), mounts
  `<App />` in StrictMode on `#root`, then registers the PWA.
- `setupAllDefaultBonds()` — wires the SEVEN universal bonds in one call:
  fonts-arimo, routing-react-router, storage-localstorage, styling-tailwind
  (registers the tailwind-merge class merger), theme-css-variables
  (light + dark via `getDefaultThemeProvider()`), ui-tailwind ClassMap,
  icons-molecule. Each also exists as an individual `setupApp*()` for apps
  that wire a la carte (per-app `app/src/bonds/<name>.ts` files stay 1-line
  re-exports of these).
- Auth/http factories — `createDefaultAuthClient(authConfig)` returns
  `{ authClient, setupAuthDefault }`; the `...WithHttpSync` /
  `...WithFetchClient` variants also keep the bonded http client's bearer
  token in sync with auth events.

## Quick Start

```tsx
// src/main.tsx
import {
  bootstrapApp,
  createDefaultAuthClientWithHttpSync,
  setupAllDefaultBonds,
  setupAppCodeEditorMonaco,
} from '@molecule/app-bonds-default-react'

import { App } from './App.js'
import { authConfig } from './config.js'

const { authClient, setupAuthDefault } =
  createDefaultAuthClientWithHttpSync(authConfig)

bootstrapApp({
  App,
  authClient,
  // Async so optional async bonds are AWAITED before the first render.
  setupProviders: async () => {
    setupAllDefaultBonds()
    setupAuthDefault()
    await setupAppCodeEditorMonaco() // only if the app uses the code editor
  },
})
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-bonds-default-react @molecule/app-auth @molecule/app-code-editor @molecule/app-code-editor-monaco @molecule/app-command-palette @molecule/app-command-palette-cmdk @molecule/app-drag-drop @molecule/app-drag-drop-dndkit @molecule/app-fonts @molecule/app-fonts-arimo @molecule/app-http @molecule/app-icons @molecule/app-icons-molecule @molecule/app-keyboard-shortcuts @molecule/app-keyboard-shortcuts-hotkeys @molecule/app-realtime @molecule/app-realtime-socketio @molecule/app-routing @molecule/app-routing-react-router @molecule/app-storage @molecule/app-storage-localstorage @molecule/app-styling-tailwind @molecule/app-theme @molecule/app-theme-css-variables @molecule/app-ui @molecule/app-ui-tailwind @molecule/app-virtual-scroll @molecule/app-virtual-scroll-tanstack react react-dom
npm install -D @types/react @types/react-dom
```

## API

### Functions

#### `bootstrapApp(opts)`

Boot the React app: wire bonds, kick off auth initialization, mount
`<App />` inside `<StrictMode>` to `#root`, and (optionally) register
the PWA service worker.

Replaces the 20-line per-app `src/main.tsx` that 97 fleet apps shipped
byte-identically.

```typescript
function bootstrapApp(opts: { App: ComponentType; authClient: { initialize: () => Promise<void>; }; setupProviders: () => void | Promise<void>; registerPWA?: () => void; }): void
```

#### `createDefaultAuthClient(authConfig)`

Builds the default JWT auth client + wires it into `@molecule/app-auth`.

Replaces the 16-line per-app `bonds/auth-default.ts` that 93 fleet
apps shipped byte-identically. Apps pass their own `authConfig`
(which lives in `src/config.ts`).

```typescript
function createDefaultAuthClient(authConfig: AuthClientConfig): { authClient: AuthClient<TUser>; setupAuthDefault: () => void; }
```

#### `createDefaultAuthClientWithFetchClient(authConfig, fetchClientOptions)`

Most aggressive variant — bonds a fetch-based HTTP client with the
given `baseURL` (so molecule pkg `useGet('/path')` calls hit
`${baseURL}/path` instead of the SPA's catch-all route), AND keeps
its bearer token in sync with auth events.

Used by apps where molecule packages render pricing / billing /
other authed JSON-fetching screens that need both behaviors.

```typescript
function createDefaultAuthClientWithFetchClient(authConfig: AuthClientConfig, fetchClientOptions: { baseURL: string; withCredentials?: boolean; }): { authClient: AuthClient<TUser>; setupAuthDefault: () => void; }
```

#### `createDefaultAuthClientWithHttpSync(authConfig)`

Variant of `createDefaultAuthClient` that also keeps the bonded
`@molecule/app-http` client's bearer token in sync with auth events
(login / register / refresh / logout). Required by apps whose http
client must carry the JWT on every request — without this wiring,
authed endpoints return 401 after page reloads or token refresh.

Hydrates the HTTP client's token from the persisted auth state
on setup, then listens for auth events to keep them aligned.

```typescript
function createDefaultAuthClientWithHttpSync(authConfig: AuthClientConfig): { authClient: AuthClient<TUser>; setupAuthDefault: () => void; }
```

#### `createDefaultHttpClient(baseURL)`

Builds the default fetch-based HTTP client + wires it into
`@molecule/app-http`. Replaces the per-app `bonds/http-default.ts`
shipped by ~52 fleet apps.

```typescript
function createDefaultHttpClient(baseURL: string): { httpClient: HttpClient; setupHttpDefault: () => void; }
```

#### `createDefaultHttpClientWithAuthBearer(opts)`

Variant of `createDefaultHttpClient` that adds a request interceptor
injecting the JWT bearer token from the auth client AND (optionally)
stripping a leading `/api/` from request URLs.

Replaces ~20 per-app `bonds/http-default.ts` files that hand-roll
this same wiring. Pass `stripApiPrefix: true` when the app uses
`baseURL: '/api'` to handle pages that pass `/api/`-prefixed paths
(would otherwise resolve to `/api/api/...` and 404).

```typescript
function createDefaultHttpClientWithAuthBearer(opts: { baseURL: string; withCredentials?: boolean; stripApiPrefix?: boolean; getToken: () => string | null | undefined; }): { httpClient: HttpClient; setupHttpDefault: () => void; }
```

#### `getDefaultThemeProvider()`

Returns (and lazily constructs) the shared default CSS-variables theme provider.

```typescript
function getDefaultThemeProvider(): ThemeProvider
```

#### `setupAllDefaultBonds()`

Wires all 7 universal app-side bonds in one call — fonts, routing,
storage, styling, theme, UI ClassMap, icons (in that order). Auth
+ i18n stay per-app because they need app-specific config.

Replaces 9 individual setupX() calls in per-app `bonds/index.ts`.

```typescript
function setupAllDefaultBonds(): void
```

#### `setupAppCodeEditorMonaco()`

Wires `@molecule/app-code-editor-monaco` to `@molecule/app-code-editor`.

```typescript
function setupAppCodeEditorMonaco(): Promise<void>
```

#### `setupAppCommandPaletteCmdk()`

Wires `@molecule/app-command-palette-cmdk` to `@molecule/app-command-palette`.

```typescript
function setupAppCommandPaletteCmdk(): Promise<void>
```

#### `setupAppDragDropDndkit()`

Wires `@molecule/app-drag-drop-dndkit` to `@molecule/app-drag-drop`.

```typescript
function setupAppDragDropDndkit(): Promise<void>
```

#### `setupAppFontsArimo()`

Wires `@molecule/app-fonts-arimo` to `@molecule/app-fonts`.

```typescript
function setupAppFontsArimo(): void
```

#### `setupAppIconsMolecule()`

Wires `@molecule/app-icons-molecule` to `@molecule/app-icons`.

```typescript
function setupAppIconsMolecule(): void
```

#### `setupAppKeyboardShortcutsHotkeys()`

Wires `@molecule/app-keyboard-shortcuts-hotkeys` to `@molecule/app-keyboard-shortcuts`.

```typescript
function setupAppKeyboardShortcutsHotkeys(): Promise<void>
```

#### `setupAppRealtimeSocketio()`

Wires `@molecule/app-realtime-socketio` to `@molecule/app-realtime`.

```typescript
function setupAppRealtimeSocketio(): Promise<void>
```

#### `setupAppRoutingReactRouter()`

Wires `@molecule/app-routing-react-router` to `@molecule/app-routing`.

```typescript
function setupAppRoutingReactRouter(): void
```

#### `setupAppStorageLocalstorage()`

Wires `@molecule/app-storage-localstorage` to `@molecule/app-storage`.

```typescript
function setupAppStorageLocalstorage(): void
```

#### `setupAppStylingTailwind()`

Wires `@molecule/app-styling-tailwind`: registers `tailwind-merge` as the
class merger for `@molecule/app-styling`'s `cn()`, so conflicting Tailwind
utilities resolve (last wins). Tailwind itself is configured via env vars +
the Vite plugin; this is the one runtime hook the framework-agnostic styling
core needs so it carries no Tailwind dependency of its own.

```typescript
function setupAppStylingTailwind(): void
```

#### `setupAppThemeCssVariables()`

Wires the default light + dark CSS-variables theme provider to `@molecule/app-theme`.

```typescript
function setupAppThemeCssVariables(): void
```

#### `setupAppUiTailwind()`

Wires `@molecule/app-ui-tailwind` `classMap` to `@molecule/app-ui`.

```typescript
function setupAppUiTailwind(): void
```

#### `setupAppVirtualScrollTanstack()`

Wires `@molecule/app-virtual-scroll-tanstack` to `@molecule/app-virtual-scroll`.

```typescript
function setupAppVirtualScrollTanstack(): Promise<void>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-fonts` ^1.0.0
- `@molecule/app-fonts-arimo` ^1.0.0
- `@molecule/app-icons` ^1.0.0
- `@molecule/app-icons-molecule` ^1.0.0
- `@molecule/app-routing` ^1.0.0
- `@molecule/app-routing-react-router` ^1.0.0
- `@molecule/app-storage` ^1.0.0
- `@molecule/app-storage-localstorage` ^1.0.0
- `@molecule/app-styling-tailwind` ^1.0.0
- `@molecule/app-theme` ^1.0.0
- `@molecule/app-theme-css-variables` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-tailwind` ^1.0.0
- `@molecule/app-auth` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0
- `@molecule/app-http` ^1.0.0
- `@molecule/app-realtime` ^1.0.0
- `@molecule/app-realtime-socketio` ^1.0.0
- `@molecule/app-keyboard-shortcuts` ^1.0.0
- `@molecule/app-keyboard-shortcuts-hotkeys` ^1.0.0
- `@molecule/app-command-palette` ^1.0.0
- `@molecule/app-command-palette-cmdk` ^1.0.0
- `@molecule/app-code-editor` ^1.0.0
- `@molecule/app-code-editor-monaco` ^1.0.0
- `@molecule/app-virtual-scroll` ^1.0.0
- `@molecule/app-virtual-scroll-tanstack` ^1.0.0
- `@molecule/app-drag-drop` ^1.0.0
- `@molecule/app-drag-drop-dndkit` ^1.0.0

### Runtime Dependencies

- `@molecule/app-auth`
- `@molecule/app-code-editor`
- `@molecule/app-code-editor-monaco`
- `@molecule/app-command-palette`
- `@molecule/app-command-palette-cmdk`
- `@molecule/app-drag-drop`
- `@molecule/app-drag-drop-dndkit`
- `@molecule/app-fonts`
- `@molecule/app-fonts-arimo`
- `@molecule/app-http`
- `@molecule/app-icons`
- `@molecule/app-icons-molecule`
- `@molecule/app-keyboard-shortcuts`
- `@molecule/app-keyboard-shortcuts-hotkeys`
- `@molecule/app-realtime`
- `@molecule/app-realtime-socketio`
- `@molecule/app-routing`
- `@molecule/app-routing-react-router`
- `@molecule/app-storage`
- `@molecule/app-storage-localstorage`
- `@molecule/app-styling-tailwind`
- `@molecule/app-theme`
- `@molecule/app-theme-css-variables`
- `@molecule/app-ui`
- `@molecule/app-ui-tailwind`
- `@molecule/app-virtual-scroll`
- `@molecule/app-virtual-scroll-tanstack`
- `react`
- `react-dom`

- `setupAllDefaultBonds()` does NOT wire the optional bonds. Those ship as
  separate ASYNC setups — `setupAppRealtimeSocketio`,
  `setupAppKeyboardShortcutsHotkeys`, `setupAppCommandPaletteCmdk`,
  `setupAppCodeEditorMonaco`, `setupAppVirtualScrollTanstack`,
  `setupAppDragDropDndkit` — and MUST be awaited inside `setupProviders`
  (make it async). `bootstrapApp` awaits `setupProviders()` before mounting
  so bonded providers exist by a component's first effect; a fire-and-forget
  async setup races the mount and intermittently loses.
- Plain `createDefaultAuthClient` does NOT attach the JWT to the bonded
  http client. If molecule packages call authed `/api` endpoints, use
  `createDefaultAuthClientWithHttpSync` (or `...WithFetchClient` to also
  bond a fetch client with a `baseURL`) — otherwise those endpoints return
  401 after a page reload or token refresh.
- `getDefaultThemeProvider()` constructs lazily because the CSS-variables
  theme provider touches `localStorage` at construction — importing this
  package is SSR/test-safe, but only CALL it in a DOM environment. Apps
  with custom themes build their own provider and skip
  `setupAppThemeCssVariables()`.
