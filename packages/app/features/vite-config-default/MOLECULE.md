# @molecule/app-vite-config-default

`@molecule/app-vite-config-default` — drop-in Vite config factory.

`createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR })`
returns the canonical fleet vite config (react + tailwind + VitePWA,
molecule-package pre-bundle exclusion, /api + /health + /socket.io (ws)
proxy, etc.) Per-app `vite.config.ts` shrinks from 105 lines to 5.

## Quick Start

```ts
import { defineConfig } from 'vite'
import { createDefaultViteConfig } from '@molecule/app-vite-config-default'
import { APP_DESCRIPTION, APP_NAME, BRAND_COLOR } from './src/branding.js'

export default defineConfig(createDefaultViteConfig({ APP_NAME, APP_DESCRIPTION, BRAND_COLOR }))
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-vite-config-default
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

## Injection Notes

### Requirements

Peer dependencies:
- `@tailwindcss/vite` ^4.0.0
- `@vitejs/plugin-react` ^4.0.0 || ^5.0.0
- `vite` ^5.0.0 || ^6.0.0 || ^7.0.0
- `vite-plugin-pwa` ^0.20.0 || ^1.0.0
