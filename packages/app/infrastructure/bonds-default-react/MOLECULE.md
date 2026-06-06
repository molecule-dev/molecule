# @molecule/app-bonds-default-react

`@molecule/app-bonds-default-react` — default app-side bond wirings.

5 setup functions consolidating the byte-identical per-app bond
wiring files (fonts-arimo, icons-molecule, routing-react-router,
storage-localstorage, styling-tailwind). Each app's
`app/src/bonds/<name>.ts` becomes a 1-line re-export:

```ts
// app/src/bonds/app-fonts-arimo.ts
export { setupAppFontsArimo } from '@molecule/app-bonds-default-react'
```

## Quick Start

```tsx
import { bootstrapApp, setupAllDefaultBonds } from '@molecule/app-bonds-default-react'
import { createDefaultAuthClient } from '@molecule/app-bonds-default-react'
import { App } from './App.js'
import { authConfig } from './config.js'

const { authClient, setupAuthDefault } = createDefaultAuthClient(authConfig)

bootstrapApp({
  App,
  authClient,
  setupProviders: () => { setupAllDefaultBonds(); setupAuthDefault() },
})
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-bonds-default-react
```

## API

### Functions

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

No-op wiring for `@molecule/app-styling-tailwind` — Tailwind is
configured via env vars and the Vite plugin rather than runtime
provider injection. Retained so `bonds/index.ts` `setupProviders()`
can call it alongside the other defaults without exceptions.

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
