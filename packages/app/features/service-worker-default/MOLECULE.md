# @molecule/app-service-worker-default

`@molecule/app-service-worker-default` — drop-in Workbox service-worker
setup.

Exports `setupDefaultServiceWorker(worker, manifest)` and the
`PrecacheEntry` type. Wires: precache manifest, app-shell navigation
fallback to `/index.html`, a same-origin PNG image cache
(StaleWhileRevalidate, max 50 entries), `clientsClaim()`, and a
SKIP_WAITING message handler.

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

### Types

#### `PrecacheEntry`

The shape of every entry vite-plugin-pwa injects into `__WB_MANIFEST`.

```typescript
type PrecacheEntry = { url: string; revision: string | null }
```

### Functions

#### `setupDefaultServiceWorker(worker, manifest)`

Wires the default service worker — precache manifest, app-shell
navigation routing, same-origin PNG image cache with
StaleWhileRevalidate, and a SKIP_WAITING message handler.

Must be called from the app's `src/service-worker.ts` so the
build-time manifest injection (vite-plugin-pwa `injectManifest`,
workbox-webpack-plugin, workbox-cli) sees the `__WB_MANIFEST`
reference inside the SW file (the tool scans the SW source for
the token at build time). See the package-level example.

```typescript
function setupDefaultServiceWorker(worker: ServiceWorkerGlobalScope, manifest: PrecacheEntry[]): void
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
- Navigation fallback is hardcoded to `/index.html` — apps served under a
  sub-path (build `base` other than `/`) need their own handler.
- The image cache matches same-origin `.png` requests ONLY; jpg/svg/webp
  are not cached — register additional routes for other formats.
- Navigations to paths starting with `/_` or containing a file extension
  bypass the app-shell fallback.
