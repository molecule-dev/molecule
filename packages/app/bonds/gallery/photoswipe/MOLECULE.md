# @molecule/app-gallery-photoswipe

PhotoSwipe provider for \@molecule/app-gallery.

Provides an in-memory gallery implementation conforming to
the molecule gallery provider interface.

## Quick Start

```typescript
import { provider } from '@molecule/app-gallery-photoswipe'
import { setProvider } from '@molecule/app-gallery'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-gallery-photoswipe
```

## API

### Interfaces

#### `PhotoSwipeConfig`

Provider-specific configuration options.

```typescript
interface PhotoSwipeConfig {
  /** Whether to enable zoom by default. Defaults to `true`. */
  zoomable?: boolean

  /** Whether to show counter by default. Defaults to `true`. */
  showCounter?: boolean
}
```

### Functions

#### `createProvider(_config)`

Creates a PhotoSwipe-based gallery provider.

```typescript
function createProvider(_config?: PhotoSwipeConfig): GalleryProvider
```

- `_config` — Optional provider configuration.

**Returns:** A configured GalleryProvider.

### Constants

#### `provider`

Default PhotoSwipe gallery provider instance.

```typescript
const provider: GalleryProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-gallery` ^1.0.0
