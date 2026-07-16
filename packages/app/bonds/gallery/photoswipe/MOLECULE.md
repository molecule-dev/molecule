# @molecule/app-gallery-photoswipe

Gallery provider for `@molecule/app-gallery` — headless, in-memory
navigation state (current index, open/close/next/previous/goTo). Despite
the name, this bond does NOT bundle or call the PhotoSwipe library (no
dependency) and renders no lightbox UI of its own.

## Quick Start

```typescript
import { provider } from '@molecule/app-gallery-photoswipe'
import { setProvider } from '@molecule/app-gallery'

setProvider(provider)   // once, at app startup (bonds.ts)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-gallery-photoswipe @molecule/app-gallery
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

## Core Interface
Implements `@molecule/app-gallery` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-gallery'
import { provider } from '@molecule/app-gallery-photoswipe'

export function setupGalleryPhotoswipe(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-gallery` ^1.0.0

### Runtime Dependencies

- `@molecule/app-gallery`

- **State-only: `open()` displays nothing.** Your app renders the lightbox
  overlay (image, prev/next, close, counter) with `getClassMap()`/`cm.*` and
  `t('key', values, { defaultValue })` labels, and re-reads
  `getCurrentIndex()` after each navigation call (there are no change events).
- **Configuration is currently inert** — `createProvider()` ignores
  `PhotoSwipeConfig` (`zoomable`, `showCounter`), and of `GalleryOptions`
  only `items`, `startIndex`, and `onClose` are honored (`zoomable`,
  `showCounter`, `showThumbnails` do nothing). Don't gate UI behavior on them.
- **Wire with `setProvider()` from `@molecule/app-gallery`** — the core keeps
  a module-local singleton; a generic `bond('gallery', …)` silently no-ops
  and `requireProvider()` throws.
