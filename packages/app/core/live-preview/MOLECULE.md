# @molecule/app-live-preview

Live preview core interface for molecule.dev.

Framework-agnostic contract for embedding a running app preview (an IDE-style
panel) with URL-bar state, device frames, Back/Forward history, and forced
reloads. Bond a provider (e.g. `@molecule/app-live-preview-iframe`) at
startup; a renderer subscribes to {@link PreviewState} and keys its (re)loads
off `url` + `loadNonce`.

## Quick Start

```typescript
import { requireProvider, setProvider } from '@molecule/app-live-preview'
import { provider } from '@molecule/app-live-preview-iframe'

setProvider(provider) // once, at startup (bonds.ts)

const preview = requireProvider()
const unsubscribe = preview.subscribe((state) => {
  // (re)load the frame from state.url, keyed on state.loadNonce;
  // show state.currentUrl in the URL bar (NOT state.url)
})
preview.setUrl('http://localhost:5173')
preview.refresh() // force-reload the SAME url — repeated setUrl is a no-op
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-live-preview @molecule/app-bond @molecule/app-i18n
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

### Runtime Dependencies

- `@molecule/app-bond`
- `@molecule/app-i18n`

- **`setUrl` with an unchanged url is a NO-OP** — call `refresh()` to force a
  reload of the same url. Renderers reload off {@link PreviewState.loadNonce},
  never off the raw url string; `back()`/`forward()`/`recordNavigation()` do
  NOT bump it (client-side history moves, not reloads).
- **The URL bar shows {@link PreviewState.currentUrl}, not `url`.** `url` is
  the load TARGET; `currentUrl` is where the preview actually is, reported by
  the running app via `window.parent.postMessage({ type: 'molecule:navigate', url })`
  on load and on every client-side route change, which the host forwards into
  {@link PreviewProvider.recordNavigation}. The sender script is injected into
  the previewed app at scaffold time (owned by the scaffolder, not this
  package); without it the preview still works, but `currentUrl` stays at the
  last load target and Back/Forward remain disabled.
- Back/Forward post a `molecule:nav-command` into the frame so the preview
  runs its own `history.back()`/`forward()` — SPA state and scroll survive.
  Guard the buttons with `canGoBack`/`canGoForward`.
- Renderers append an internal `?_r=<timestamp>` cache-buster
  ({@link PREVIEW_CACHE_BUSTER_PARAM}) on recovery reloads; the provider
  strips it ({@link stripCacheBuster}) so it never reaches the URL bar or the
  navigation history.

## E2E Tests

Integration checklist — drive the real preview panel this app renders (use
navigate_preview, read_preview_ui, and interact_preview; no mocks), adapt each
item to this app's actual preview UI + routes, and check every box off one by
one. A box you can't check is an integration bug to fix — not a skip:
- [ ] The preview panel renders the target app at its current location: the URL
  bar shows the app's route (`currentUrl`, not the raw load target) and
  read_preview_ui returns the previewed screen's visible elements + pageText, not
  a blank frame.
- [ ] Selecting a device frame/preset resizes the preview to that device: a
  `mobile` frame narrows the viewport, `tablet` is mid-width, `desktop` is wide,
  and `none` shows it unframed/full-width. Switch between two presets and confirm
  the framed width ACTUALLY changes — not merely that a button looks selected.
- [ ] Auto-refresh works: change a source file and the preview reloads on its own
  to show the latest, with no manual reload — read_preview_ui reflects the new
  content. The reload is a `loadNonce` bump (a repeated `setUrl` with the same url
  is a no-op), so verify the CONTENT updated, not just that a reload fired.
- [ ] Navigating inside the preview updates the shown route: click an in-app link
  (or navigate_preview to a new path) and the URL bar's `currentUrl` follows the
  client-side route change the app reports via the `molecule:navigate` message —
  the frame does not stay stuck on the old route.
- [ ] Back/Forward move through the preview's own history: after two in-app
  navigations, Back returns to the previous route and Forward re-advances, and
  each button is disabled exactly when `canGoBack`/`canGoForward` say there is
  nowhere to go (Back disabled at the first entry).
- [ ] A failed or blank load surfaces state, never a silently dead frame: point
  the preview at an unreachable/erroring route and the panel shows a visible
  error or empty state (`error` set; an alert/status message in read_preview_ui),
  not a frozen blank iframe.

## Translations

Translation strings are provided by `@molecule/app-locales-live-preview`.
