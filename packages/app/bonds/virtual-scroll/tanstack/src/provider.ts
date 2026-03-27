/**
 * TanStack Virtual implementation of the molecule VirtualScrollProvider.
 *
 * Wraps `@tanstack/virtual-core` to provide virtual/infinite scrolling
 * through the framework-agnostic virtual scroll interface.
 *
 * @module
 */

import {
  elementScroll,
  measureElement,
  observeElementOffset,
  observeElementRect,
  observeWindowOffset,
  observeWindowRect,
  Virtualizer,
  windowScroll,
} from '@tanstack/virtual-core'

import type {
  ScrollToOptions,
  VirtualItem,
  VirtualScrollInstance,
  VirtualScrollOptions,
  VirtualScrollProvider,
} from '@molecule/app-virtual-scroll'

import type { TanStackVirtualConfig } from './types.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Determines whether a scroll element is a Window object.
 *
 * @param el - The element to check.
 * @returns `true` if the element is a Window.
 */
function isWindow(el: unknown): el is Window {
  return typeof window !== 'undefined' && el === window
}

/** TanStack VirtualItem shape (subset used for conversion). */
interface TanStackVirtualItemLike {
  /** Unique key. */
  key: string | number | bigint
  /** Item index. */
  index: number
  /** Start offset. */
  start: number
  /** End offset. */
  end: number
  /** Item size. */
  size: number
  /** Lane index. */
  lane: number
}

/**
 * Normalizes a VirtualItem from TanStack to our interface (key type narrowing).
 *
 * @param item - The TanStack VirtualItem.
 * @returns A molecule VirtualItem.
 */
function toVirtualItem(item: TanStackVirtualItemLike): VirtualItem {
  return {
    key: typeof item.key === 'bigint' ? Number(item.key) : item.key,
    index: item.index,
    start: item.start,
    end: item.end,
    size: item.size,
    lane: item.lane,
  }
}

// ---------------------------------------------------------------------------
// TanStack Virtual wrapper
// ---------------------------------------------------------------------------

/**
 * Creates a VirtualScrollInstance backed by TanStack Virtual.
 *
 * @param scrollElement - The scrollable container element, a getter, or Window.
 * @param options - The molecule virtual scroll options.
 * @param config - Optional TanStack-specific configuration.
 * @returns A VirtualScrollInstance wrapping a TanStack Virtualizer.
 */
function createVirtualizerInstance(
  scrollElement: unknown | (() => unknown),
  options: VirtualScrollOptions,
  config: TanStackVirtualConfig = {},
): VirtualScrollInstance {
  const getScrollElement =
    typeof scrollElement === 'function'
      ? (scrollElement as () => Element | Window | null)
      : () => scrollElement as Element | Window | null

  const resolvedElement = getScrollElement()
  const isWindowScroll = isWindow(resolvedElement)

  let currentOptions = { ...options }
  let cleanup: (() => void) | undefined

  const virtualizer = new Virtualizer<Element | Window, Element>({
    count: options.count,
    getScrollElement,
    estimateSize: options.estimateSize,
    overscan: options.overscan,
    horizontal: options.axis === 'horizontal',
    paddingStart: options.paddingStart,
    paddingEnd: options.paddingEnd,
    gap: options.gap,
    lanes: options.lanes,
    isRtl: options.isRtl,
    initialOffset: options.initialOffset,
    getItemKey: options.getItemKey,
    enabled: options.enabled ?? true,
    debug: config.debug,
    isScrollingResetDelay: config.isScrollingResetDelay,
    useScrollendEvent: config.useScrollendEvent,
    onChange: options.onChange
      ? () => {
          if (currentOptions.onChange) {
            currentOptions.onChange(instance)
          }
        }
      : undefined,
    // Platform-specific observation/scroll functions — cast through `any`
    // because TanStack generics are contravariant on TScrollElement.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    observeElementRect: (isWindowScroll ? observeWindowRect : observeElementRect) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    observeElementOffset: (isWindowScroll ? observeWindowOffset : observeElementOffset) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scrollToFn: (isWindowScroll ? windowScroll : elementScroll) as any,
    measureElement,
  })

  // Mount the virtualizer to start observing
  cleanup = virtualizer._didMount()

  // Call _willUpdate to ensure derived state is ready
  virtualizer._willUpdate()

  const instance: VirtualScrollInstance = {
    // -- Query --
    getVirtualItems(): VirtualItem[] {
      virtualizer._willUpdate()
      return virtualizer.getVirtualItems().map(toVirtualItem)
    },

    getTotalSize(): number {
      virtualizer._willUpdate()
      return virtualizer.getTotalSize()
    },

    isScrolling(): boolean {
      return virtualizer.isScrolling
    },

    getScrollOffset(): number {
      return virtualizer.scrollOffset ?? 0
    },

    // -- Navigation --
    scrollToIndex(index: number, opts?: ScrollToOptions): void {
      virtualizer.scrollToIndex(index, {
        align: opts?.align,
        behavior: opts?.behavior,
      })
    },

    scrollToOffset(offset: number, opts?: ScrollToOptions): void {
      virtualizer.scrollToOffset(offset, {
        align: opts?.align,
        behavior: opts?.behavior,
      })
    },

    // -- Measurement --
    measure(): void {
      virtualizer.measure()
    },

    measureElement(element: unknown): void {
      virtualizer.measureElement(element as Element | null)
    },

    resizeItem(index: number, size: number): void {
      virtualizer.resizeItem(index, size)
    },

    // -- Mutation --
    setCount(count: number): void {
      currentOptions = { ...currentOptions, count }
      virtualizer.setOptions({
        ...virtualizer.options,
        count,
      })
    },

    setOptions(newOptions: Partial<VirtualScrollOptions>): void {
      currentOptions = { ...currentOptions, ...newOptions }

      virtualizer.setOptions({
        ...virtualizer.options,
        count: currentOptions.count,
        estimateSize: currentOptions.estimateSize,
        overscan: currentOptions.overscan,
        horizontal: currentOptions.axis === 'horizontal',
        paddingStart: currentOptions.paddingStart,
        paddingEnd: currentOptions.paddingEnd,
        gap: currentOptions.gap,
        lanes: currentOptions.lanes,
        isRtl: currentOptions.isRtl,
        getItemKey: currentOptions.getItemKey,
        enabled: currentOptions.enabled ?? true,
      })
    },

    // -- Lifecycle --
    destroy(): void {
      if (cleanup) {
        cleanup()
        cleanup = undefined
      }
    },
  }

  return instance
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Creates a TanStack Virtual-backed virtual scroll provider.
 *
 * @param config - Optional TanStack-specific configuration.
 * @returns A `VirtualScrollProvider` backed by TanStack Virtual.
 *
 * @example
 * ```typescript
 * import { createTanStackProvider } from '@molecule/app-virtual-scroll-tanstack'
 * import { setProvider } from '@molecule/app-virtual-scroll'
 *
 * setProvider(createTanStackProvider())
 * ```
 */
export function createTanStackProvider(config: TanStackVirtualConfig = {}): VirtualScrollProvider {
  return {
    createVirtualizer(
      scrollElement: unknown | (() => unknown),
      options: VirtualScrollOptions,
    ): VirtualScrollInstance {
      return createVirtualizerInstance(scrollElement, options, config)
    },
  }
}

/** Default TanStack Virtual provider instance. */
export const provider: VirtualScrollProvider = createTanStackProvider()
