import { useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface ImageGalleryProps {
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
 * @param root0
 * @param root0.images
 * @param root0.selectedIndex
 * @param root0.onSelect
 * @param root0.maxThumbnails
 * @param root0.alts
 * @param root0.className
 */
export function ImageGallery({
  images,
  selectedIndex,
  onSelect,
  maxThumbnails = 4,
  alts,
  className,
}: ImageGalleryProps) {
  const cm = getClassMap()
  const [internalIndex, setInternalIndex] = useState(0)
  const idx = selectedIndex ?? internalIndex
  const setIdx = (i: number) => {
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
        <div className={cm.grid({ cols: maxThumbnails as 4, gap: 'sm' })}>
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
