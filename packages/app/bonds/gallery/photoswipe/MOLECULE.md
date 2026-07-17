# @molecule/app-gallery-photoswipe

PhotoSwipe v5 gallery provider for `@molecule/app-gallery`.

Drives the real PhotoSwipe lightbox: `open()` constructs a `PhotoSwipe`
instance from the core `GalleryItem[]` (mapped to PhotoSwipe slides) and calls
`.init()` to actually display it; `close()` and navigation delegate to the
live instance. This is a real, rendering provider — not headless state.

## Quick Start

```typescript
// REQUIRED — also `import 'photoswipe/style.css'` in your app entry (see @remarks)
import { provider } from '@molecule/app-gallery-photoswipe'
import { setProvider, requireProvider } from '@molecule/app-gallery'

setProvider(provider)                // once, at app startup (bonds.ts)

const gallery = requireProvider().createGallery({
  items: [{ src: '/photos/1.jpg', width: 1200, height: 800, alt: 'Sunset' }],
  zoomable: true,
})
gallery.open(0)                      // opens the PhotoSwipe lightbox at item 0
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-gallery-photoswipe @molecule/app-gallery photoswipe
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

#### `createProvider(config)`

Creates a PhotoSwipe-based gallery provider.

Per-gallery `GalleryOptions` (`zoomable`, `showCounter`) override the
provider-level `PhotoSwipeConfig`; both default to PhotoSwipe's own defaults.

```typescript
function createProvider(config?: PhotoSwipeConfig): GalleryProvider
```

- `config` — Optional provider-level configuration.

**Returns:** A configured GalleryProvider backed by PhotoSwipe v5.

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
- `photoswipe`

- **Import PhotoSwipe's stylesheet yourself** — this package does not:
  `import 'photoswipe/style.css'` (aka `photoswipe/dist/photoswipe.css`).
  Without it the lightbox opens unstyled/invisible.
- **Browser-only.** `open()` runs `new PhotoSwipe(...).init()`, which needs a
  live DOM — construct/open galleries in a client-only effect, never during SSR.
- **`open()` renders the real lightbox** (unlike a headless provider). Each
  `GalleryItem` maps to a PhotoSwipe slide — `src`, `width`, `height`, `alt`;
  `thumbnail` → `msrc` (low-res placeholder); `caption` carried through — opened
  at `startIndex`/the given index. `getCurrentIndex()` follows PhotoSwipe's own
  navigation (arrows/swipe/keyboard) via its `change` event.
- **`GalleryOptions` drive PhotoSwipe:** `onClose` fires on the lightbox `close`
  event; `zoomable` → PhotoSwipe's `zoom` button, `showCounter` → its `counter`
  (per-gallery options override the provider-level `PhotoSwipeConfig`; both
  default on). `showThumbnails` has no effect — PhotoSwipe core has no thumbnail
  strip (it needs a separate plugin).
- **Wire with `setProvider()` from `@molecule/app-gallery`** — the core keeps a
  module-local singleton; a generic `bond('gallery', …)` silently no-ops and
  `requireProvider()` throws.

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
