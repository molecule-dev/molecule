# @molecule/app-service-worker-default

`@molecule/app-service-worker-default` — drop-in workbox SW setup.

App-shell navigation routing, image cache with StaleWhileRevalidate,
precache manifest from vite-plugin-pwa, and a SKIP_WAITING message
handler. The token `__WB_MANIFEST` is still referenced inside the
app's per-app `service-worker.ts` so vite-plugin-pwa's build-time
injection finds it correctly.

## Quick Start

```ts
/// <reference lib="webworker" />
import { setupDefaultServiceWorker } from '@molecule/app-service-worker-default'

// Must live in the app's own src/service-worker.ts so vite-plugin-pwa's
// build-time injection finds the `__WB_MANIFEST` token.
const sw = self as unknown as ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

setupDefaultServiceWorker(sw, sw.__WB_MANIFEST)
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-service-worker-default
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
navigation routing, image cache with StaleWhileRevalidate, and a
SKIP_WAITING message handler.

Must be called from the app's `src/service-worker.ts` so
vite-plugin-pwa's manifest injection sees the `__WB_MANIFEST`
reference inside the SW file (the plugin scans the SW source for
the token at build time).

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
