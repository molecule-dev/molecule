# @molecule/app-virtual-scroll

Virtual scroll core interface for molecule.dev.

Provides a framework-agnostic contract for virtual/infinite scrolling
of large lists and grids. Bond a provider (e.g.
`@molecule/app-virtual-scroll-tanstack`) at startup, then use
{@link createVirtualizer} anywhere.

## Quick Start

```typescript
import { createVirtualizer } from '@molecule/app-virtual-scroll'

const virtualizer = createVirtualizer(scrollElement, {
  count: 10000,
  estimateSize: () => 50,
  overscan: 5,
})

const items = virtualizer.getVirtualItems()
const totalSize = virtualizer.getTotalSize()
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-virtual-scroll
```

## API

### Interfaces

#### `ScrollToOptions`

Options for programmatic scroll operations.

```typescript
interface ScrollToOptions {
  /** Where to align the target within the viewport. Defaults to `'auto'`. */
  align?: ScrollAlignment
  /** Scroll animation behavior. Defaults to `'auto'`. */
  behavior?: ScrollBehavior
}
```

#### `VirtualItem`

Represents a single item within the virtualizer's visible range.

```typescript
interface VirtualItem {
  /** Unique key for the item. Defaults to the item index. */
  key: string | number
  /** Zero-based index in the source data. */
  index: number
  /** Starting pixel offset from the scroll container's origin. */
  start: number
  /** Ending pixel offset. */
  end: number
  /** Measured or estimated size (width or height depending on axis). */
  size: number
  /** Lane index for masonry/multi-lane layouts. `0` for standard lists. */
  lane: number
}
```

#### `VirtualScrollInstance`

A live virtualizer instance exposing query and control methods.

```typescript
interface VirtualScrollInstance {
  // -- Query ----------------------------------------------------------------

  /** Returns the currently visible (plus overscan) virtual items. */
  getVirtualItems(): VirtualItem[]

  /** Returns the total size (pixels) of all items, used to size the scroll container. */
  getTotalSize(): number

  /** Returns `true` while the user is actively scrolling. */
  isScrolling(): boolean

  /** Returns the current scroll offset in pixels. */
  getScrollOffset(): number

  // -- Navigation -----------------------------------------------------------

  /**
   * Scrolls to bring the item at the given index into view.
   *
   * @param index - The item index to scroll to.
   * @param options - Alignment and behavior options.
   */
  scrollToIndex(index: number, options?: ScrollToOptions): void

  /**
   * Scrolls to the given pixel offset.
   *
   * @param offset - The pixel offset to scroll to.
   * @param options - Alignment and behavior options.
   */
  scrollToOffset(offset: number, options?: ScrollToOptions): void

  // -- Measurement ----------------------------------------------------------

  /**
   * Forces a re-measurement of all items. Call this when item sizes change
   * without the virtualizer detecting it automatically.
   */
  measure(): void

  /**
   * Measures a specific DOM element and updates the virtualizer's cache.
   * Used when implementing dynamic item sizing.
   *
   * @param element - The DOM element (or null) to measure.
   */
  measureElement(element: unknown): void

  /**
   * Resizes the item at the given index to the specified size.
   *
   * @param index - The item index.
   * @param size - The new size in pixels.
   */
  resizeItem(index: number, size: number): void

  // -- Mutation --------------------------------------------------------------

  /**
   * Updates the total item count. Call this when the backing data set
   * changes length (e.g. after loading more items for infinite scroll).
   *
   * @param count - The new total item count.
   */
  setCount(count: number): void

  /**
   * Replaces the options on the virtualizer (excluding scroll element binding).
   *
   * @param options - Partial options to merge.
   */
  setOptions(options: Partial<VirtualScrollOptions>): void

  // -- Lifecycle ------------------------------------------------------------

  /** Releases resources held by the virtualizer instance. */
  destroy(): void
}
```

#### `VirtualScrollOptions`

Configuration for creating a virtualizer instance.

```typescript
interface VirtualScrollOptions {
  /** Total number of items in the data set. */
  count: number

  /**
   * Returns the estimated size (in pixels) for an item at the given index.
   * Used before actual measurement occurs.
   *
   * @param index - The item index.
   * @returns Estimated size in pixels.
   */
  estimateSize: (index: number) => number

  /** Scroll axis. Defaults to `'vertical'`. */
  axis?: ScrollAxis

  /**
   * Number of extra items to render outside the visible area.
   * Higher values reduce blank flicker during fast scrolling at the
   * cost of more DOM nodes. Defaults to provider implementation choice.
   */
  overscan?: number

  /** Padding in pixels at the start of the scroll container. */
  paddingStart?: number

  /** Padding in pixels at the end of the scroll container. */
  paddingEnd?: number

  /** Gap in pixels between items. */
  gap?: number

  /** Number of parallel lanes (for masonry layouts). Defaults to `1`. */
  lanes?: number

  /** Whether the layout is right-to-left. Defaults to `false`. */
  isRtl?: boolean

  /** Initial scroll offset in pixels. */
  initialOffset?: number

  /**
   * Returns a stable key for the item at the given index.
   * Defaults to using the index itself.
   *
   * @param index - The item index.
   * @returns A stable key.
   */
  getItemKey?: (index: number) => string | number

  /**
   * Called whenever the virtualizer state changes (scroll, resize, etc.).
   *
   * @param instance - The virtualizer instance.
   */
  onChange?: (instance: VirtualScrollInstance) => void

  /** Whether to enable the virtualizer. Defaults to `true`. */
  enabled?: boolean
}
```

#### `VirtualScrollProvider`

Contract that bond packages must implement to provide virtual scrolling
functionality.

```typescript
interface VirtualScrollProvider {
  /**
   * Creates a new virtualizer instance from the given options and scroll
   * element. The scroll element is passed separately because it is a
   * framework concern — the provider receives it from framework bindings
   * or test harnesses.
   *
   * @param scrollElement - The scrollable container element (or a getter returning it).
   * @param options - Virtualizer configuration.
   * @returns A virtualizer instance for querying virtual items and controlling scroll.
   */
  createVirtualizer(
    scrollElement: unknown | (() => unknown),
    options: VirtualScrollOptions,
  ): VirtualScrollInstance
}
```

### Types

#### `ScrollAlignment`

Alignment when scrolling to an item or offset.

```typescript
type ScrollAlignment = 'start' | 'center' | 'end' | 'auto'
```

#### `ScrollAxis`

Scroll axis orientation.

```typescript
type ScrollAxis = 'vertical' | 'horizontal'
```

#### `ScrollBehavior`

Scroll behavior — instant or animated.

```typescript
type ScrollBehavior = 'auto' | 'smooth'
```

### Functions

#### `createVirtualizer(scrollElement, options)`

Creates a new virtualizer instance using the bonded provider.

```typescript
function createVirtualizer(scrollElement: unknown, options: VirtualScrollOptions): VirtualScrollInstance
```

- `scrollElement` — The scrollable container element (or a getter returning it).
- `options` — Virtualizer configuration.

**Returns:** A virtualizer instance for querying virtual items and controlling scroll.

#### `getProvider()`

Retrieves the bonded virtual scroll provider, throwing if none is configured.

```typescript
function getProvider(): VirtualScrollProvider
```

**Returns:** The bonded virtual scroll provider.

#### `hasProvider()`

Checks whether a virtual scroll provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a virtual scroll provider is bonded.

#### `setProvider(provider)`

Registers a virtual scroll provider as the active singleton. Called by bond
packages (e.g. `@molecule/app-virtual-scroll-tanstack`) during app startup.

```typescript
function setProvider(provider: VirtualScrollProvider): void
```

- `provider` — The virtual scroll provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
