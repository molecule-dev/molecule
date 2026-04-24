import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface SlideThumbnailProps {
  /** Slide index (1-based). */
  index: number
  /** Live preview content (rendered scaled-down). */
  children?: ReactNode
  /** Whether the thumbnail represents the active slide. */
  active?: boolean
  /** Click handler. */
  onClick?: () => void
  /** Optional aspect ratio (defaults to 16/9). */
  aspect?: '16/9' | '4/3' | '1/1'
  /** Width in pixels. Defaults to 160. */
  width?: number
  /** Extra classes. */
  className?: string
}

/**
 * Slide thumbnail tile for presentation editors / slideshow navigators.
 * Apps render the live scaled-down preview as `children`; this
 * component provides the surrounding chrome (active outline + index
 * label).
 * @param root0
 * @param root0.index
 * @param root0.children
 * @param root0.active
 * @param root0.onClick
 * @param root0.aspect
 * @param root0.width
 * @param root0.className
 */
export function SlideThumbnail({
  index,
  children,
  active,
  onClick,
  aspect = '16/9',
  width = 160,
  className,
}: SlideThumbnailProps) {
  const cm = getClassMap()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      aria-label={`Slide ${index}`}
      className={cm.cn(cm.position('relative'), cm.cursorPointer, className)}
      style={{
        width,
        aspectRatio: aspect.replace('/', ' / '),
        outline: active ? '2px solid currentColor' : 'none',
        outlineOffset: 2,
        background: '#fff',
        overflow: 'hidden',
        border: 'none',
        padding: 0,
      }}
    >
      {children}
      <span
        style={{
          position: 'absolute',
          left: 4,
          top: 4,
          padding: '0 4px',
          fontSize: 10,
          fontWeight: 700,
          background: 'rgba(0,0,0,0.6)',
          color: '#fff',
          borderRadius: 3,
        }}
      >
        {index}
      </span>
    </button>
  )
}
