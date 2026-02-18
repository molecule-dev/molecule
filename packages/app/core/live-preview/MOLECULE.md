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
  setUrl(url: string): void
  getUrl(): string
  refresh(): void
  setDevice(device: DeviceFrame): void
  getState(): PreviewState
  navigateTo(path: string): void
  subscribe(callback: (state: PreviewState) => void): () => void
  openExternal(): void
}
```

#### `PreviewState`

State for preview.

```typescript
interface PreviewState {
  url: string
  isLoading: boolean
  device: DeviceFrame
  error: string | null
  isConnected: boolean
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

## Available Providers

| Provider | Package |
|----------|---------|
| Iframe | `@molecule/app-live-preview-iframe` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-live-preview`.
