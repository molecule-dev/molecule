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
npm install @molecule/app-gallery
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

- **The instance is headless — `open()` displays nothing by itself.** Your app
  renders the lightbox overlay (image, prev/next, close, counter) with
  `getClassMap()`/`cm.*` and `t('key', values, { defaultValue })` for labels, and
  drives it via `open/close/next/previous/goTo`, re-reading `getCurrentIndex()`
  after each call (there is no change-subscription API).
- **Wire with `setProvider()` from THIS package, not `bond('gallery', …)`** — the
  singleton is module-local; `requireProvider()` throws otherwise.
- Provide real `width`/`height` per item (they drive layout/zoom math) and an
  `alt` for accessibility — empty alt text fails the a11y bar.
