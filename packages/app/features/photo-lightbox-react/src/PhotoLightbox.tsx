import type { JSX, ReactNode } from 'react'
import { useCallback, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap, type KitKeyboardEvent } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-react'
import { Box, Image, Text } from '@molecule/app-ui-react/elements'

/**
 * A single photo entry for the lightbox, with src, optional alt text, and optional caption.
 */
export interface LightboxPhoto {
  src: string
  alt?: string
  caption?: ReactNode
}

/** Props for {@link PhotoLightbox}. */
export interface PhotoLightboxProps {
  /** Photos array. */
  photos: LightboxPhoto[]
  /** Whether the lightbox is open. */
  open: boolean
  /** Called when the user closes (X, backdrop, Escape). */
  onClose: () => void
  /** Initial active index. */
  initialIndex?: number
  /** Called whenever the active index changes. */
  onIndexChange?: (index: number) => void
}

/**
 * Fullscreen photo viewer with prev/next arrows, keyboard navigation
 * (← → Esc), close button, and optional captions.
 * @param props - Component props (see {@link PhotoLightboxProps}).
 */
export function PhotoLightbox({
  photos,
  open,
  onClose = () => {},
  initialIndex = 0,
  onIndexChange,
}: PhotoLightboxProps): JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [index, setIndex] = useState(initialIndex)
  const total = photos.length

  const setIdx = useCallback(
    (next: number) => {
      const clamped = (next + total) % total
      setIndex(clamped)
      onIndexChange?.(clamped)
    },
    [total, onIndexChange],
  )

  // Opening the lightbox (or a new `initialIndex`) rewinds to the start photo.
  // Adjusted during render — React's pattern for state derived from previous
  // props — so the first open frame already shows `initialIndex`.
  const [prevEntry, setPrevEntry] = useState({ open, initialIndex })
  if (prevEntry.open !== open || prevEntry.initialIndex !== initialIndex) {
    setPrevEntry({ open, initialIndex })
    if (open) setIndex(initialIndex)
  }

  const navigate = (event: KitKeyboardEvent): void => {
    if (event.key === 'ArrowLeft') setIdx(index - 1)
    else if (event.key === 'ArrowRight') setIdx(index + 1)
  }

  if (!open || total === 0) return null
  const photo = photos[index]

  return (
    <Modal
      open
      onClose={onClose}
      onKeyDown={navigate}
      size="full"
      closeLabel={t('lightbox.close', {}, { defaultValue: 'Close' })}
      aria-label={
        photo.alt ??
        t(
          'lightbox.imageOfTotal',
          { index: index + 1, total },
          { defaultValue: 'Image {{index}} of {{total}}' },
        )
      }
    >
      {total > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIdx(index - 1)}
          aria-label={t('lightbox.previous', {}, { defaultValue: 'Previous' })}
          className={cm.position('absolute')}
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}
        >
          ‹
        </Button>
      )}
      <Box
        as="figure"
        webStyle={{ margin: '0 auto', maxWidth: '90vw', maxHeight: '90vh', textAlign: 'center' }}
      >
        <Image
          src={photo.src}
          alt={
            photo.alt ??
            t('lightbox.image', { index: index + 1 }, { defaultValue: 'Image {{index}}' })
          }
          webStyle={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
        />
        {photo.caption && (
          <Text as="figcaption" className={cm.textMuted} webStyle={{ padding: 12, fontSize: 14 }}>
            {photo.caption}
          </Text>
        )}
      </Box>
      {total > 1 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIdx(index + 1)}
          aria-label={t('lightbox.next', {}, { defaultValue: 'Next' })}
          className={cm.position('absolute')}
          style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)' }}
        >
          ›
        </Button>
      )}
      <Box
        as="div"
        className={cm.textMuted}
        webStyle={{
          position: 'absolute',
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 12,
        }}
      >
        {index + 1} / {total}
      </Box>
    </Modal>
  )
}
