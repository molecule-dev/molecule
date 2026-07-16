# @molecule/app-live-preview-iframe

Iframe-based live preview provider for molecule.dev — manages preview STATE
(load-target `url`, URL-bar `currentUrl`, Back/Forward history, device
frame, loading/error, `loadNonce`). A companion renderer (e.g.
`@molecule/app-ide-react`'s preview panel) renders the actual `<iframe>`
and feeds `notifyLoaded` / `notifyError` / `recordNavigation` back in.

## Quick Start

```typescript
import { setProvider } from '@molecule/app-live-preview'
import { provider } from '@molecule/app-live-preview-iframe'

setProvider(provider)   // once, at app startup (bonds.ts)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-live-preview-iframe @molecule/app-live-preview
```

## API

### Interfaces

#### `IframePreviewConfig`

Configuration for iframe preview.

```typescript
interface IframePreviewConfig {
  /** Initial preview URL. */
  defaultUrl?: string
  /** Default device frame. */
  defaultDevice?: DeviceFrame
  /** Auto-refresh on URL change. */
  autoRefresh?: boolean
  /** Delay in ms before auto-refresh. */
  refreshDelay?: number
}
```

### Classes

#### `IframePreviewProvider`

Iframe-based implementation of `PreviewProvider`. Manages preview URL, device frame selection,
loading state, and connection status. The actual iframe rendering is handled by a companion React component.

### Functions

#### `createProvider(config)`

Creates an `IframePreviewProvider` with optional default URL and device frame.

```typescript
function createProvider(config?: IframePreviewConfig): IframePreviewProvider
```

- `config` — Iframe preview configuration (default URL, default device frame).

**Returns:** An `IframePreviewProvider` that manages live preview state.

### Constants

#### `provider`

Pre-instantiated provider singleton.

```typescript
const provider: IframePreviewProvider
```

## Core Interface
Implements `@molecule/app-live-preview` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-live-preview'
import { provider } from '@molecule/app-live-preview-iframe'

export function setupLivePreviewIframe(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-live-preview` ^1.0.0

### Runtime Dependencies

- `@molecule/app-live-preview`

- **`IframePreviewConfig.autoRefresh` and `refreshDelay` are currently
  INERT** — only `defaultUrl` and `defaultDevice` are read. Use `refresh()`
  to force a reload.
- `setUrl(sameUrl)` is a deliberate no-op — renderers key reloads off
  `loadNonce`. See `@molecule/app-live-preview`'s remarks for the full
  renderer contract (`molecule:navigate` reporting, nav-command Back/Forward,
  `?_r` cache-buster stripping) — this bond implements all of it.
