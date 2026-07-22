# @molecule/app-service-worker-default

`@molecule/app-service-worker-default` — drop-in Workbox service-worker
setup.

Exports `setupDefaultServiceWorker(worker, manifest, options?)`, the
`PrecacheEntry` type, and `DEFAULT_IMAGE_EXTENSIONS`. Wires: precache
manifest, app-shell navigation fallback (base-path aware — derived from
`self.registration.scope`, overridable), a same-origin image cache for all
common web formats (png/jpg/jpeg/webp/avif/gif/svg/ico, StaleWhileRevalidate,
max 50 entries), `clientsClaim()`, and a SKIP_WAITING message handler.

## Quick Start

```ts
/// <reference lib="webworker" />
import { setupDefaultServiceWorker } from '@molecule/app-service-worker-default'

// Must live in the app's own src/service-worker.ts so the build-time
// manifest injection finds the __WB_MANIFEST token in the SW source.
const sw = self as unknown as ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

setupDefaultServiceWorker(sw, sw.__WB_MANIFEST)
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-service-worker-default workbox-core workbox-expiration workbox-precaching workbox-routing workbox-strategies
```

## API

### Interfaces

#### `DefaultServiceWorkerOptions`

Options for {@link setupDefaultServiceWorker}. All fields are optional —
sensible defaults derive the base path from the SW registration scope and
cache all common web image formats.

```typescript
interface DefaultServiceWorkerOptions {
  /**
   * The precached URL the app-shell navigation fallback resolves to.
   *
   * Defaults to `index.html` resolved against `self.registration.scope`, so an
   * app built with a non-root Vite `base` (e.g. served under `/app/`) falls
   * back to the correct `/app/index.html` — NOT a hardcoded `/index.html`,
   * which would 404/mis-route under a sub-path. Pass an explicit value to
   * override (must match a URL present in the precache manifest).
   */
  navigationFallback?: string
  /**
   * File extensions (lower-case, no leading dot) the image cache matches.
   * Defaults to {@link DEFAULT_IMAGE_EXTENSIONS}.
   */
  imageExtensions?: readonly string[]
  /** Max entries retained by the image cache. Defaults to `50`. */
  imageCacheMaxEntries?: number
}
```

### Types

#### `PrecacheEntry`

The shape of every entry vite-plugin-pwa injects into `__WB_MANIFEST`.

```typescript
type PrecacheEntry = { url: string; revision: string | null }
```

### Functions

#### `setupDefaultServiceWorker(worker, manifest, options)`

Wires the default service worker — precache manifest, base-aware app-shell
navigation routing, a same-origin multi-format image cache with
StaleWhileRevalidate, and a SKIP_WAITING message handler.

Must be called from the app's `src/service-worker.ts` so the
build-time manifest injection (vite-plugin-pwa `injectManifest`,
workbox-webpack-plugin, workbox-cli) sees the `__WB_MANIFEST`
reference inside the SW file (the tool scans the SW source for
the token at build time). See the package-level example.

```typescript
function setupDefaultServiceWorker(worker: ServiceWorkerGlobalScope, manifest: PrecacheEntry[], options?: DefaultServiceWorkerOptions): void
```

- `worker` — The service-worker global scope (`self`).
- `manifest` — The precache manifest (`self.__WB_MANIFEST`).
- `options` — Optional overrides — see {@link DefaultServiceWorkerOptions}. By default the navigation fallback is derived from the registration scope (base-path aware) and the image cache matches all common web image formats.

### Constants

#### `DEFAULT_IMAGE_EXTENSIONS`

Common web image extensions the default image cache matches (lower-case,
without the leading dot). Covers the raster + vector formats a modern app
actually ships — not just `.png`.

```typescript
const DEFAULT_IMAGE_EXTENSIONS: readonly string[]
```

## Injection Notes

### Requirements

Peer dependencies:
- `workbox-core` ^7.0.0
- `workbox-expiration` ^7.0.0
- `workbox-precaching` ^7.0.0
- `workbox-routing` ^7.0.0
- `workbox-strategies` ^7.0.0

### Runtime Dependencies

- `workbox-core`
- `workbox-expiration`
- `workbox-precaching`
- `workbox-routing`
- `workbox-strategies`

- This is only the SW-file half: the app must also REGISTER the worker
  (vite-plugin-pwa's `registerSW()`, or
  `navigator.serviceWorker.register('/service-worker.js')` on load) —
  nothing here registers anything.
- Works with any Workbox InjectManifest-compatible build (vite-plugin-pwa
  `injectManifest`, workbox-webpack-plugin, workbox-cli). The
  `__WB_MANIFEST` token must appear in YOUR SW source file — it is not
  inside this package.
- All five `workbox-*` packages are peerDependencies — install
  `workbox-core`, `workbox-expiration`, `workbox-precaching`,
  `workbox-routing`, `workbox-strategies` in the app.
- Navigation fallback is base-path aware: by default it resolves `index.html`
  against `self.registration.scope`, so an app built with a non-root Vite
  `base` (e.g. served under `/app/`) falls back to `/app/index.html`
  automatically. Override via `options.navigationFallback` when needed.
- The image cache matches same-origin requests for all common web image
  formats (png/jpg/jpeg/webp/avif/gif/svg/ico) case-insensitively. Narrow or
  widen the set via `options.imageExtensions`.
- Navigations to paths starting with `/_` or containing a file extension
  bypass the app-shell fallback.
