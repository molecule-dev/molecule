# @molecule/app-live-preview

Live preview core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-live-preview
```

## API

### Interfaces

#### `PreviewConfig`

Configuration for preview.

```typescript
interface PreviewConfig {
  url: string
  defaultDevice?: DeviceFrame
  interactive?: boolean
  autoRefresh?: boolean
  refreshDelay?: number
}
```

#### `PreviewProvider`

Provider interface for preview.

```typescript
interface PreviewProvider {
  readonly name: string
  /**
   * Sets the preview's load target and bumps {@link PreviewState.loadNonce} so
   * the renderer (re)loads it. No-ops when `url` repeats the previous `setUrl`
   * call — to force a reload of the SAME url, call {@link PreviewProvider.refresh}
   * instead.
   * @param url - The new URL to load in the preview.
   */
  setUrl(url: string): void
  getUrl(): string
  refresh(): void
  setDevice(device: DeviceFrame): void
  getState(): PreviewState
  navigateTo(path: string): void
  /**
   * Records a navigation the running preview reported (via the
   * `molecule:navigate` message — see the interface `@remarks`). Updates the
   * current location for the URL bar; invalid or non-`http(s)` URLs are ignored,
   * and the host's internal cache-buster ({@link PREVIEW_CACHE_BUSTER_PARAM}) is
   * stripped so it never leaks into the URL bar or the Back/Forward history.
   * @param url - The preview's new location (absolute `http`/`https` URL).
   * @param isReplace - Whether the preview REPLACED its current history entry (a
   * `replaceState` redirect/canonicalization) rather than ADDING one (a
   * `pushState`). A replace swaps the current entry in place and PRESERVES the
   * forward stack (so Forward stays enabled); a push (the default) opens a new
   * branch and truncates forward. Defaults to `false`.
   */
  recordNavigation(url: string, isReplace?: boolean): void
  /**
   * Navigates the preview to the previous entry in its navigation history (the
   * history is built from {@link PreviewProvider.recordNavigation} and
   * {@link PreviewProvider.setUrl} calls). This is a CLIENT-SIDE history move,
   * NOT a reload: it updates {@link PreviewState.currentUrl} + the nav flags and
   * leaves {@link PreviewState.url}/`loadNonce` untouched. The renderer posts a
   * `molecule:nav-command` so the preview runs its own `history.back()`,
   * preserving scroll position + SPA state. No-op when
   * {@link PreviewState.canGoBack} is `false`.
   */
  back(): void
  /**
   * Navigates the preview to the next entry in its navigation history — a
   * client-side history move (see {@link PreviewProvider.back}), not a reload.
   * No-op when {@link PreviewState.canGoForward} is `false`.
   */
  forward(): void
  /**
   * Reports whether the preview can navigate back in its history.
   * @returns Whether a Back navigation is currently possible.
   */
  canGoBack(): boolean
  /**
   * Reports whether the preview can navigate forward in its history.
   * @returns Whether a Forward navigation is currently possible.
   */
  canGoForward(): boolean
  subscribe(callback: (state: PreviewState) => void): () => void
  openExternal(): void
}
```

#### `PreviewState`

State for preview.

```typescript
interface PreviewState {
  /**
   * The URL the preview is asked to LOAD (the iframe `src` target). Changing it
   * (via `setUrl`/`navigateTo`/`back`/`forward`) reloads the preview document.
   */
  url: string
  /**
   * The preview's ACTUAL current location, as reported by the running preview
   * through the {@link PreviewProvider.recordNavigation} channel (the
   * `molecule:navigate` iframe message — see {@link PreviewProvider}). This is
   * what a URL bar should display; it tracks in-app (client-side) route changes
   * that do NOT reload the document. Falls back to {@link PreviewState.url} when
   * the preview has not reported a location yet.
   */
  currentUrl: string
  isLoading: boolean
  device: DeviceFrame
  error: string | null
  isConnected: boolean
  /** Whether there is a previous entry in the navigation history (enables Back). */
  canGoBack: boolean
  /** Whether there is a forward entry in the navigation history (enables Forward). */
  canGoForward: boolean
  /**
   * Monotonically increasing counter bumped whenever the preview should
   * (re)load its current {@link PreviewState.url} — `navigateTo` and `refresh`
   * always bump it; `setUrl` bumps it ONLY when `url` differs from the current
   * load target (a repeated `setUrl` call with an UNCHANGED url is a no-op — see
   * {@link PreviewProvider.setUrl}). A renderer keys its iframe (re)load off
   * this. To force a reload of the SAME url, call `refresh()`, not `setUrl`.
   * {@link PreviewProvider.recordNavigation}, {@link PreviewProvider.back}, and
   * {@link PreviewProvider.forward} do NOT bump it: a reported in-app navigation
   * already happened, and Back/Forward are client-side history moves driven by a
   * `molecule:nav-command` to the iframe — none of the three is a cold reload.
   */
  loadNonce: number
}
```

### Types

#### `DeviceFrame`

Device Frame type.

```typescript
type DeviceFrame = 'none' | 'mobile' | 'tablet' | 'desktop'
```

### Functions

#### `getProvider()`

Retrieves the bonded live preview provider, or `null` if none is bonded.

```typescript
function getProvider(): PreviewProvider | null
```

**Returns:** The bonded preview provider, or `null`.

#### `hasProvider()`

Checks whether a live preview provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a live preview provider is bonded.

#### `requireProvider()`

Retrieves the bonded live preview provider, throwing if none is configured.

```typescript
function requireProvider(): PreviewProvider
```

**Returns:** The bonded preview provider.

#### `setProvider(provider)`

Registers a live preview provider as the active singleton.

```typescript
function setProvider(provider: PreviewProvider): void
```

- `provider` — The preview provider implementation to bond.

#### `stripCacheBuster(url)`

Removes the host's internal cache-buster ({@link PREVIEW_CACHE_BUSTER_PARAM})
from a URL before it is shown in the URL bar or recorded in the navigation
history, leaving every other query param and the hash intact. Used by the
provider on each location the preview reports back.

```typescript
function stripCacheBuster(url: string): string
```

- `url` — The reported URL (may carry the internal cache-buster).

**Returns:** The URL with the cache-buster param removed (unchanged when absent).

#### `withCacheBuster(url)`

Appends the host's internal cache-buster ({@link PREVIEW_CACHE_BUSTER_PARAM})
to a URL so reloading it bypasses the browser cache (a fresh `src` string the
iframe is guaranteed to reload, even when the location is unchanged). Used by
the renderer on every recovery reload. String concatenation (not `URL`) keeps
the rest of the URL byte-for-byte identical so an unrelated reload never
re-encodes the user's path/query.

```typescript
function withCacheBuster(url: string): string
```

- `url` — The URL to force-reload.

**Returns:** The URL with a unique `_r=<timestamp>` query param appended.

### Constants

#### `PREVIEW_CACHE_BUSTER_PARAM`

Query-param name of the host's INTERNAL preview cache-buster. The preview
renderer appends `?{@link PREVIEW_CACHE_BUSTER_PARAM}=<timestamp>` to the
iframe `src` to FORCE a fresh document load on recovery (a brand-new URL the
browser is guaranteed not to serve from cache). It is purely a host-side
implementation detail — but the running preview faithfully echoes its full
`location.href` (cache-buster and all) back through the `molecule:navigate`
message, so the provider must strip it before it reaches the URL bar or the
Back/Forward history.

```typescript
const PREVIEW_CACHE_BUSTER_PARAM: "_r"
```

## Available Providers

| Provider | Package |
|----------|---------|
| Iframe | `@molecule/app-live-preview-iframe` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
- `@molecule/app-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-live-preview`.
