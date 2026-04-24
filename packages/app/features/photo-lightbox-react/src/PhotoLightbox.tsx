import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-react'

/**
 *
 */
export interface LightboxPhoto {
  src: string
  alt?: string
  caption?: ReactNode
}

interface PhotoLightboxProps {
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
 * @param root0
 * @param root0.photos
 * @param root0.open
 * @param root0.onClose
 * @param root0.initialIndex
 * @param root0.onIndexChange
 */
export function PhotoLightbox({
  photos,
  open,
  onClose,
  initialIndex = 0,
  onIndexChange,
}: PhotoLightboxProps) {
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

  useEffect(() => {
    if (open) setIndex(initialIndex)
  }, [open, initialIndex])

  useEffect(() => {
    if (!open) return
    /**
     *
     * @param e
     */
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') setIdx(index - 1)
      else if (e.key === 'ArrowRight') setIdx(index + 1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, index, setIdx, onClose])

  if (!open || total === 0) return null
  const photo = photos[index]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt ?? `Image ${index + 1} of ${total}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className={cm.cn(cm.position('fixed'))}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        aria-label={t('lightbox.close', {}, { defaultValue: 'Close' })}
        className={cm.position('absolute')}
      >
        ✕
      </Button>
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
      <figure style={{ margin: 0, maxWidth: '90vw', maxHeight: '90vh', textAlign: 'center' }}>
        <img
          src={photo.src}
          alt={photo.alt ?? `Image ${index + 1}`}
          style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
        />
        {photo.caption && (
          <figcaption style={{ color: '#fff', padding: 12, fontSize: 14 }}>
            {photo.caption}
          </figcaption>
        )}
      </figure>
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
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#fff',
          fontSize: 12,
        }}
      >
        {index + 1} / {total}
      </div>
    </div>
  )
}
