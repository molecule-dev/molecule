import { type JSX, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

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

export interface ImageGalleryProps {
  /** Image URLs in display order. */
  images: string[]
  /** Controlled selected index — caller owns state. */
  selectedIndex?: number
  /** Called when a thumbnail is clicked. */
  onSelect?: (index: number) => void
  /** Max thumbnails shown. Extra are summarised as "+N". */
  maxThumbnails?: number
  /** Alt-text for screen readers. Applied per-image; falls back to `'Image N'`. */
  alts?: string[]
  /** Extra classes on the outer wrapper. */
  className?: string
}

/**
 * Main image + thumbnail grid gallery. Controlled-optional: when
 * `selectedIndex` is omitted the component tracks its own selection.
 *
 * Used for product images, property listings, portfolio galleries.
 * @param props - Component props (see {@link ImageGalleryProps}).
 */
export function ImageGallery({
  images,
  selectedIndex,
  onSelect,
  maxThumbnails = 4,
  alts,
  className,
}: ImageGalleryProps): JSX.Element | null {
  const cm = getClassMap()
  const [internalIndex, setInternalIndex] = useState(0)
  const idx = selectedIndex ?? internalIndex
  const setIdx = (i: number): void => {
    if (selectedIndex === undefined) setInternalIndex(i)
    onSelect?.(i)
  }
  if (images.length === 0) return null
  const visible = images.slice(0, maxThumbnails)
  const overflow = Math.max(0, images.length - visible.length)
  return (
    <div className={cm.cn(cm.stack(2), className)}>
      <div style={{ aspectRatio: '4 / 3' }}>
        <img
          src={images[idx]}
          alt={alts?.[idx] ?? `Image ${idx + 1}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      {images.length > 1 && (
        <div className={cm.grid({ cols: toGridCols(maxThumbnails), gap: 'sm' })}>
          {visible.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-current={i === idx ? 'true' : undefined}
              aria-label={alts?.[i] ?? `Image ${i + 1}`}
              style={{ aspectRatio: '1 / 1' }}
            >
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
          {overflow > 0 && (
            <div
              className={cm.cn(
                cm.flex({ align: 'center', justify: 'center' }),
                cm.textSize('sm'),
                cm.fontWeight('semibold'),
              )}
              style={{ aspectRatio: '1 / 1' }}
            >
              +{overflow}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
