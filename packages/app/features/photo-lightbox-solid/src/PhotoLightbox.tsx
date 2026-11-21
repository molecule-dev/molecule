import type { Component, JSX } from 'solid-js'
import { createEffect, createSignal, onCleanup, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-solid'

import type { PhotoLightboxProps } from './types.js'

/** React's overlay style (`position: fixed`, `z-index: 100`; the scrim is `cm.bgScrim`'s class). */
const ROOT_STYLE: JSX.CSSProperties = {
  position: 'fixed',
  inset: '0',
  'z-index': '100',
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
}
/** React's figure style. */
const FIGURE_STYLE: JSX.CSSProperties = {
  margin: '0',
  'max-width': '90vw',
  'max-height': '90vh',
  'text-align': 'center',
}
/** React's image style. */
const IMG_STYLE: JSX.CSSProperties = {
  'max-width': '100%',
  'max-height': '80vh',
  'object-fit': 'contain',
}
/** React's caption style (the caption colour is `cm.textOnTone`'s class). */
const CAPTION_STYLE: JSX.CSSProperties = {
  padding: '12px',
  'font-size': '14px',
}
/** React's "N / total" counter style (the counter colour is `cm.textOnTone`'s class). */
const COUNTER_STYLE: JSX.CSSProperties = {
  position: 'absolute',
  bottom: '16px',
  left: '0',
  right: '0',
  'text-align': 'center',
  'font-size': '12px',
}
/** React's previous-arrow style. */
const PREVIOUS_STYLE = {
  position: 'absolute',
  left: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
} as const
/** React's next-arrow style. */
const NEXT_STYLE = {
  position: 'absolute',
  right: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
} as const

/**
 * Fullscreen photo viewer with prev/next arrows, keyboard navigation
 * (← → Esc), close button, and optional captions.
 *
 * This is the Solid counterpart of `@molecule/app-photo-lightbox-react`: the
 * same props (React names), the same ClassMap tokens, the same i18n keys, and
 * the same DOM for the same input.
 *
 * @param props - Component props (see {@link PhotoLightboxProps}).
 * @returns The rendered lightbox, or nothing while closed or empty.
 */
export const PhotoLightbox: Component<PhotoLightboxProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [index, setIndex] = createSignal(props.initialIndex ?? 0)

  const total = (): number => props.photos.length
  const photo = (): PhotoLightboxProps['photos'][number] => props.photos[index()]

  /** Clamps an index into the gallery (React's modulo wrap) and reports it. */
  const setIdx = (next: number): void => {
    const count = props.photos.length
    const clamped = (next + count) % count
    setIndex(clamped)
    props.onIndexChange?.(clamped)
  }

  // React's `useEffect(() => { if (open) setIndex(initialIndex) }, [open, initialIndex])`.
  createEffect(() => {
    const open = props.open
    const initial = props.initialIndex ?? 0
    if (open) setIndex(initial)
  })

  // React's document keydown listener while open: ← → navigate, Escape closes.
  createEffect(() => {
    if (!props.open) return
    /** React's keydown handler. */
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') props.onClose()
      else if (event.key === 'ArrowLeft') setIdx(index() - 1)
      else if (event.key === 'ArrowRight') setIdx(index() + 1)
    }
    document.addEventListener('keydown', onKey)
    onCleanup(() => document.removeEventListener('keydown', onKey))
  })

  /** React's backdrop click: close only when the overlay itself was clicked. */
  const onBackdropClick = (event: MouseEvent): void => {
    if (event.target === event.currentTarget) props.onClose()
  }

  return (
    <Show when={props.open && total() > 0}>
      {/* The overlay is a click-to-dismiss screen (role="presentation"):
          clicking it directly closes; clicks on the controls inside do not.
          The dialog itself is the element inside it, so Escape (handled on
          `document` in the keydown effect) stays the keyboard path. */}
      <div
        role="presentation"
        onClick={onBackdropClick}
        class={cm.cn(cm.position('fixed'), cm.bgScrim)}
        style={ROOT_STYLE}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={photo().alt ?? `Image ${index() + 1} of ${total()}`}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={props.onClose}
            aria-label={t('lightbox.close', {}, { defaultValue: 'Close' })}
            className={cm.position('absolute')}
          >
            ✕
          </Button>
          <Show when={total() > 1}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIdx(index() - 1)}
              aria-label={t('lightbox.previous', {}, { defaultValue: 'Previous' })}
              className={cm.position('absolute')}
              style={PREVIOUS_STYLE}
            >
              ‹
            </Button>
          </Show>
          <figure style={FIGURE_STYLE}>
            <img src={photo().src} alt={photo().alt ?? `Image ${index() + 1}`} style={IMG_STYLE} />
            <Show when={photo().caption}>
              <figcaption class={cm.textOnTone} style={CAPTION_STYLE}>
                {photo().caption}
              </figcaption>
            </Show>
          </figure>
          <Show when={total() > 1}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIdx(index() + 1)}
              aria-label={t('lightbox.next', {}, { defaultValue: 'Next' })}
              className={cm.position('absolute')}
              style={NEXT_STYLE}
            >
              ›
            </Button>
          </Show>
          <div class={cm.textOnTone} style={COUNTER_STYLE}>
            {index() + 1} / {total()}
          </div>
        </div>
      </div>
    </Show>
  )
}
