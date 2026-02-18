# @molecule/app-live-preview-iframe

Iframe-based live preview provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-live-preview-iframe
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-live-preview` ^1.0.0
