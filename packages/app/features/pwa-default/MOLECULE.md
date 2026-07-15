# @molecule/app-pwa-default

`@molecule/app-pwa-default` — drop-in PWA service worker registration
with update banner, multi-tab coordination, and i18n-localized labels.

Apps' `src/pwa.ts` shrinks from 147 lines to a 1-line re-export.

## Quick Start

```ts
// src/pwa.ts is a 1-line re-export:
//   export { registerPWA } from '@molecule/app-pwa-default'
// then call it once at app startup (e.g. in main.tsx):
import { registerPWA } from '@molecule/app-pwa-default'

registerPWA()
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-pwa-default @molecule/app-i18n @molecule/app-logger vite-plugin-pwa
```

## API

### Functions

#### `registerPWA()`

Registers the service worker with full PWA lifecycle management:
- Periodic update checks (every 5 minutes)
- Styled update banner with Update button
- Multi-tab coordination (all tabs reload when new SW activates)
- Window focus notification to SW
- Error recovery (unregister SW + reload on fatal errors)

```typescript
function registerPWA(): void
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `vite-plugin-pwa` ^0.20.0 || ^1.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-logger`
- `vite-plugin-pwa`
