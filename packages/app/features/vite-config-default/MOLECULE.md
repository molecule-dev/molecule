# @molecule/app-vite-config-default

`@molecule/app-vite-config-default` — drop-in Vite config factory.

`createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR })`
returns the canonical fleet vite config (react + tailwind + VitePWA,
molecule-package pre-bundle exclusion, /api + /health + /socket.io (ws)
proxy, push service worker). Per-app `vite.config.ts` shrinks from 105
lines to 5. Also exports `moleculePushServiceWorkerPlugin` /
`PUSH_SW_FILENAME` / `PUSH_SW_SOURCE` (the web-push half of the
generated service worker).

## Quick Start

```ts
import { defineConfig } from 'vite'

import { createDefaultViteConfig } from '@molecule/app-vite-config-default'

// In a scaffolded app these come from './src/branding.js'.
const APP_NAME = 'Acme'
const APP_DESCRIPTION = 'Acme dashboard'
const BRAND_COLOR = '#6750a4'

// The app's vite.config.ts wraps this exact call in `export default`.
const config = defineConfig(createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR }))
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-vite-config-default @tailwindcss/vite @vitejs/plugin-react vite vite-plugin-pwa
```

## API

### Interfaces

#### `DefaultViteConfigBranding`

Branding strings used in the PWA manifest.

```typescript
interface DefaultViteConfigBranding {
  APP_NAME: string
  APP_DESCRIPTION: string
  BRAND_COLOR: string
}
```

### Functions

#### `createDefaultViteConfig(branding)`

Returns the canonical Vite config used by every fleet app — react +
tailwind + VitePWA plugins, molecule-package pre-bundle exclusion,
dev server proxy for `/api` + `/health` + `/socket.io` (ws), and the
standard env conventions.

Replaces the 105-line per-app `vite.config.ts` shipped by 110 fleet
apps. Per-app vite.config.ts shrinks to:

```ts
import { defineConfig } from 'vite'
import { createDefaultViteConfig } from '@molecule/app-vite-config-default'
import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './src/branding.js'

export default defineConfig(createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR }))
```

```typescript
function createDefaultViteConfig(branding: DefaultViteConfigBranding): UserConfig
```

#### `moleculePushServiceWorkerPlugin()`

Vite plugin that ships {@link PUSH_SW_SOURCE} with the app:

- build: emits `push-sw.js` into the bundle output (before VitePWA's
  `closeBundle` builds the Workbox worker that `importScripts` it);
- dev/preview server: serves `/push-sw.js` directly (dev builds run no
  service worker, but the file stays inspectable and preview servers of
  older builds keep working).

```typescript
function moleculePushServiceWorkerPlugin(): Plugin<any>
```

**Returns:** The configured Vite plugin.

### Constants

#### `PUSH_SW_FILENAME`

Public filename the push handler is served/emitted under (origin root).

```typescript
const PUSH_SW_FILENAME: "push-sw.js"
```

#### `PUSH_SW_SOURCE`

Plain-JS source of the push service-worker extension. Kept dependency-free
(no Workbox imports) so it can be `importScripts`-ed into the generated
worker as-is and unit-tested by evaluating the same source.

```typescript
const PUSH_SW_SOURCE: "/**\n * molecule push service-worker extension — imported into the Workbox\n * generateSW output via importScripts (see @molecule/app-vite-config-default).\n * Displays incoming web-push payloads and focuses/opens the app on click.\n */\n;(function (self) {\n  'use strict'\n\n  /**\n   * Normalize the two payload conventions molecule apis send:\n   *   { title, body, href }                     — flat (template fan-outs)\n   *   { title, options: { body, data, ... } }   — NotificationPayload\n   * Returns null when no title can be derived (nothing to show).\n   */\n  var normalizePushPayload = function (data) {\n    if (!data) return null\n    var payload = null\n    try {\n      payload = data.json()\n    } catch (_error) {\n      // Not JSON — degrade to plain text as the title.\n      var text = ''\n      try {\n        text = data.text()\n      } catch (_error2) {\n        text = ''\n      }\n      payload = text ? { title: text } : null\n    }\n    if (!payload || !payload.title) return null\n\n    var options = Object.assign({}, payload.options || {})\n    if (options.body === undefined && typeof payload.body === 'string') {\n      options.body = payload.body\n    }\n    var extra = Object.assign({}, options.data || {})\n    if (extra.href === undefined && typeof payload.href === 'string') {\n      extra.href = payload.href\n    }\n    options.data = extra\n    return { title: payload.title, options: options }\n  }\n\n  self.addEventListener('push', function (event) {\n    var notification = normalizePushPayload(event.data)\n    if (!notification) return\n    event.waitUntil(\n      self.registration.showNotification(notification.title, notification.options),\n    )\n  })\n\n  self.addEventListener('notificationclick', function (event) {\n    event.notification.close()\n    var data = event.notification.data || {}\n    var href = typeof data.href === 'string' && data.href ? data.href : '/'\n    event.waitUntil(\n      self.clients\n        .matchAll({ type: 'window', includeUncontrolled: true })\n        .then(function (clients) {\n          var client = clients && clients.length > 0 ? clients[0] : null\n          if (!client) {\n            return self.clients.openWindow(href)\n          }\n          var focused = client.focus()\n          // Best-effort deep link; not every focused client can navigate\n          // (cross-origin/uncontrolled), and focusing alone is still correct.\n          if (href !== '/' && typeof client.navigate === 'function') {\n            return Promise.resolve(focused)\n              .then(function () {\n                return client.navigate(href)\n              })\n              .catch(function (_error) {\n                return client\n              })\n          }\n          return focused\n        }),\n    )\n  })\n})(self)\n"
```

## Injection Notes

### Requirements

Peer dependencies:
- `@tailwindcss/vite` ^4.0.0
- `@vitejs/plugin-react` ^4.0.0 || ^5.0.0
- `vite` ^5.0.0 || ^6.0.0 || ^7.0.0
- `vite-plugin-pwa` ^0.20.0 || ^1.0.0

### Runtime Dependencies

- `@tailwindcss/vite`
- `@vitejs/plugin-react`
- `vite`
- `vite-plugin-pwa`

Env conventions the config reads: `VITE_PORT` (dev port, default 3000),
`VITE_HOST` (default 0.0.0.0), `VITE_API_URL` (proxy target for /api,
/health, /socket.io; defaults to http://localhost:PORT with PORT
defaulting to 4000), `VITE_CACHE_DIR` (per-app Vite cache dir — under
workspace-symlinked node_modules the default cache is shared machine-wide
and corrupts under concurrent dev servers), and `VITE_OPEN=false` or
`BROWSER=none` to stop the dev server auto-opening a browser tab (vite's
`--open` flag takes no value — from automation, use the env vars).

Every `@molecule/*` package is EXCLUDED from dependency pre-bundling
(bond state lives in module-level singletons; pre-bundling duplicates
them and silently breaks `bond()` wiring) — EXCEPT
`@molecule/app-locales-*` bonds, which are force-included because they
are pure data and unbundled they fan out into thousands of dev-server
module requests. `react`, `react-dom`, `react-router` and
`react-router-dom` sit in `resolve.dedupe`; when a `@molecule/*-react`
package calls hooks from another peer library (zustand,
`@tanstack/react-query`, ...), that library must be added to dedupe too or
two module instances break its React context. A CJS dep that crashes
with "does not provide an export named 'default'" should be declared as
`"molecule": { "viteOptimizeInclude": ["<dep>"] }` in the package.json
of the `@molecule` package that OWNS the dep — this factory aggregates all
such declarations into `optimizeDeps.include` automatically.

The factory takes no options beyond branding — extend the result with
vite's `mergeConfig(createDefaultViteConfig(branding), overrides)`.
The PWA build emits `push-sw.js` and importScripts it into the Workbox
generateSW worker so delivered web-push notifications actually display.
