# @molecule/app-gallery

Gallery core interface for molecule.dev.

Framework-agnostic contract for image gallery / lightbox **state**
(item list, current index, open/closed). Bond a provider (e.g.
`@molecule/app-gallery-photoswipe`) to supply the navigation logic; your
UI renders the lightbox and calls the instance to navigate.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/app-gallery'
import { provider } from '@molecule/app-gallery-photoswipe'

setProvider(provider)                    // once, at app startup (bonds.ts)

const gallery = requireProvider().createGallery({
  items: [{ src: '/photos/1.jpg', width: 1200, height: 800, alt: 'Sunset' }],
  zoomable: true,
})
gallery.open(0)   // then render your overlay from getCurrentIndex()
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-gallery @molecule/app-bond
```

## API

### Interfaces

#### `GalleryInstance`

A live gallery instance returned by the provider.

```typescript
interface GalleryInstance {
  /**
   * Opens the gallery at the specified index.
   *
   * @param index - Zero-based index to open at. Defaults to `0`.
   */
  open(index?: number): void

  /**
   * Closes the gallery.
   */
  close(): void

  /**
   * Advances to the next item.
   */
  next(): void

  /**
   * Goes back to the previous item.
   */
  previous(): void

  /**
   * Jumps to a specific item by index.
   *
   * @param index - Zero-based item index.
   */
  goTo(index: number): void

  /**
   * Returns the index of the currently visible item.
   *
   * @returns Zero-based index of the current item.
   */
  getCurrentIndex(): number
}
```

#### `GalleryItem`

A single item in an image gallery.

```typescript
interface GalleryItem {
  /** Full-resolution image source URL. */
  src: string

  /** Optional thumbnail image source URL. */
  thumbnail?: string

  /** Image width in pixels. */
  width: number

  /** Image height in pixels. */
  height: number

  /** Alternative text for accessibility. */
  alt?: string

  /** Optional caption displayed below the image. */
  caption?: string
}
```

#### `GalleryOptions`

Configuration options for creating a gallery.

```typescript
interface GalleryOptions {
  /** Items to display in the gallery. */
  items: GalleryItem[]

  /** Index of the initially visible item. Defaults to `0`. */
  startIndex?: number

  /** Callback when the gallery is closed. */
  onClose?: () => void

  /** Whether to show thumbnail navigation strip. Defaults to `false`. */
  showThumbnails?: boolean

  /** Whether to show item counter (e.g. "3 / 10"). Defaults to `true`. */
  showCounter?: boolean

  /** Whether to enable zoom functionality. Defaults to `true`. */
  zoomable?: boolean
}
```

#### `GalleryProvider`

Gallery provider interface.

All gallery providers must implement this interface to create
and manage image gallery / lightbox UI.

```typescript
interface GalleryProvider {
  /** Provider name identifier. */
  readonly name: string

  /**
   * Creates a new gallery instance.
   *
   * @param options - Configuration for the gallery.
   * @returns A gallery instance for controlling the lightbox.
   */
  createGallery(options: GalleryOptions): GalleryInstance
}
```

### Functions

#### `getProvider()`

Retrieves the bonded gallery provider, or `null` if none is bonded.

```typescript
function getProvider(): GalleryProvider | null
```

**Returns:** The active gallery provider, or `null`.

#### `hasProvider()`

Checks whether a gallery provider has been bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a gallery provider is available.

#### `requireProvider()`

Retrieves the bonded gallery provider, throwing if none is configured.

```typescript
function requireProvider(): GalleryProvider
```

**Returns:** The active gallery provider.

#### `setProvider(provider)`

Registers a gallery provider as the active singleton.

```typescript
function setProvider(provider: GalleryProvider): void
```

- `provider` — The gallery provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Gallery | `@molecule/app-gallery-photoswipe` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`

- **The instance is headless — `open()` displays nothing by itself.** Your app
  renders the lightbox overlay (image, prev/next, close, counter) with
  `getClassMap()`/`cm.*` and `t('key', values, { defaultValue })` for labels, and
  drives it via `open/close/next/previous/goTo`, re-reading `getCurrentIndex()`
  after each call (there is no change-subscription API).
- **Wire with THIS package's `setProvider()` or `bond('gallery', …)`** —
  `setProvider()` delegates into the shared `@molecule/app-bond` registry, so both
  write the same slot; `requireProvider()` throws until one has run.
- Provide real `width`/`height` per item (they drive layout/zoom math) and an
  `alt` for accessibility — empty alt text fails the a11y bar.

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
