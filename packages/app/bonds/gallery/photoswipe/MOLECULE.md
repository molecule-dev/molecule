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

## E2E Tests

Integration checklist - drive the real UI (live preview, no mocks), adapt
each item to this app's actual gallery screen, and check every box off one
by one. A box you can't check is an integration bug to fix - not a skip:
- [ ] The gallery grid/layout renders every item, and each image actually
  loads - a real rendered <img> with natural dimensions > 0, not a
  broken-image icon or empty box. Thumbnails (when an item sets one) load
  in the grid instead of the full-res src.
- [ ] Clicking a grid image opens the lightbox showing THAT image:
  getCurrentIndex() equals the clicked index and the overlay displays the
  matching full-res src (the headless instance renders nothing on its own -
  your overlay must actually appear on open()).
- [ ] next()/previous() step through the items in order - getCurrentIndex()
  moves by one and the displayed image changes to match; at the first/last
  item they wrap or stop exactly as the UI is designed to, never going blank.
- [ ] goTo(i) and the thumbnail strip (when showThumbnails) jump straight to
  item i; the counter (when showCounter, the default) reads the correct
  "current / total".
- [ ] alt text and captions render when the item provides them; zoom
  (when zoomable, the default) actually magnifies the open image.
- [ ] If the grid lazy-loads, offscreen images are NOT all fetched up front -
  they load as they scroll into view; each one loads (no broken image).
- [ ] Closing the lightbox (close(), the close control, or Escape when
  supported) fires onClose and returns to the grid with no overlay left
  covering the page.
- [ ] Keyboard navigation works wherever the UI supports it - arrow keys
  move prev/next and Escape closes, matching the pointer behaviour above.
- [ ] Every image loads from the app's own origin (uploaded or bundled
  assets), not a broken external hotlink - no image request 404s or is
  blocked by egress.
