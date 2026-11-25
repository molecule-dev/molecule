import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Pressable, Text } from '@molecule/app-ui-react/elements'

/** Props for the {@link SlideThumbnail} component. */
export interface SlideThumbnailProps {
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
 * @param props - Component props (see {@link SlideThumbnailProps}).
 */
export function SlideThumbnail({
  index,
  children,
  active,
  onClick,
  aspect = '16/9',
  width = 160,
  className,
}: SlideThumbnailProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <Pressable
      as="button"
      type="button"
      onClick={onClick}
      aria-current={active ? true : undefined}
      data-mol-id="slide-thumbnail"
      data-slide-index={index}
      aria-label={t('slideThumbnail.label', { index }, { defaultValue: 'Slide {{index}}' })}
      className={cm.cn(cm.position('relative'), cm.cursorPointer, cm.surface, className)}
      /* mol-bespoke-button: slide thumbnail CARD, not a CTA — the caller sizes
         it and its whole face is the live preview, so the inline
         border/padding are the card's canvas, not button chrome; the canvas
         colour comes from `cm.surface` (the theme's surface token). */
      webStyle={{
        width,
        aspectRatio: aspect.replace('/', ' / '),
        outline: active ? '2px solid currentColor' : 'none',
        outlineOffset: 2,
        overflow: 'hidden',
        border: 'none',
        padding: 0,
      }}
    >
      {children}
      <Text
        as="span"
        className={cm.cn(cm.bgScrim, cm.textOnTone)}
        webStyle={{
          position: 'absolute',
          left: 4,
          top: 4,
          padding: '0 4px',
          fontSize: 10,
          fontWeight: 700,
          borderRadius: 3,
        }}
      >
        {index}
      </Text>
    </Pressable>
  )
}
