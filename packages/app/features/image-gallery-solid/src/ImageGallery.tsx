import type { Component } from 'solid-js'
import { createSignal, For, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { ImageGalleryProps } from './types.js'

/**
 * Column counts the ClassMap `cm.grid()` resolver can actually render. The
 * `@molecule/app-ui-tailwind` grid CVA only defines these keys — any other
 * value produces no `grid-cols-*` class and the thumbnails collapse into a
 * single column. Keep in sync with that bond's `grid` variants.
 */
const SUPPORTED_GRID_COLS = [1, 2, 3, 4, 5, 6, 12] as const

/**
 * Snaps an arbitrary desired column count to the largest ClassMap-supported
 * value that does not exceed it (minimum 1). This lets any `maxThumbnails`
 * render a real grid — thumbnails beyond the chosen column count simply wrap
 * onto additional rows instead of breaking the layout.
 *
 * @param desired - The requested number of columns (e.g. `maxThumbnails`).
 * @returns A column count guaranteed to resolve to a `grid-cols-*` class.
 */
function toGridCols(desired: number): number {
  const clamped = Math.max(1, Math.floor(desired || 0))
  let best: number = SUPPORTED_GRID_COLS[0]
  for (const cols of SUPPORTED_GRID_COLS) {
    if (cols <= clamped) best = cols
  }
  return best
}

/**
 * Main image + thumbnail grid gallery. Controlled-optional: when
 * `selectedIndex` is omitted the component tracks its own selection.
 *
 * Used for product images, property listings, portfolio galleries.
 *
 * This is the Solid counterpart of `@molecule/app-image-gallery-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link ImageGalleryProps}).
 * @returns The rendered image gallery.
 */
export const ImageGallery: Component<ImageGalleryProps> = (props) => {
  const cm = getClassMap()
  const [internalIndex, setInternalIndex] = createSignal(0)

  /** The selected index (the controlled prop, else the component's own). */
  const idx = (): number => props.selectedIndex ?? internalIndex()

  /** The max thumbnails, defaulting to React's 4. */
  const maxThumbnails = (): number => props.maxThumbnails ?? 4

  /** The thumbnails React keeps: `images.slice(0, maxThumbnails)`. */
  const visible = (): string[] => props.images.slice(0, maxThumbnails())

  /** How many images the "+N" chip summarises. */
  const overflow = (): number => Math.max(0, props.images.length - visible().length)

  /**
   * Selects thumbnail `index`, keeping the internal state only while the
   * gallery is uncontrolled, then reports the index to `onSelect`.
   *
   * @param index - The clicked thumbnail's index.
   */
  const setIdx = (index: number): void => {
    if (props.selectedIndex === undefined) setInternalIndex(index)
    props.onSelect?.(index)
  }

  return (
    <Show when={props.images.length > 0}>
      <div class={cm.cn(cm.stack(2), props.className)}>
        <div style="aspect-ratio: 4 / 3">
          <img
            src={props.images[idx()]}
            alt={props.alts?.[idx()] ?? `Image ${idx() + 1}`}
            style="width: 100%; height: 100%; object-fit: cover"
          />
        </div>
        <Show when={props.images.length > 1}>
          <div class={cm.grid({ cols: toGridCols(maxThumbnails()), gap: 'sm' })}>
            <For each={visible()}>
              {(src, i) => (
                <button
                  type="button"
                  onClick={() => setIdx(i())}
                  aria-current={i() === idx() ? 'true' : undefined}
                  aria-label={props.alts?.[i()] ?? `Image ${i() + 1}`}
                  style="aspect-ratio: 1 / 1"
                >
                  <img src={src} alt="" style="width: 100%; height: 100%; object-fit: cover" />
                </button>
              )}
            </For>
            <Show when={overflow() > 0}>
              <div
                class={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.textSize('sm'),
                  cm.fontWeight('semibold'),
                )}
                style="aspect-ratio: 1 / 1"
              >
                +{overflow()}
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  )
}
