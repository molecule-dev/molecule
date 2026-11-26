import type { Component, JSX } from 'solid-js'
import { createEffect, createSignal, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap, type KitKeyboardEvent } from '@molecule/app-ui'
import { Button, Modal } from '@molecule/app-ui-solid'

import type { PhotoLightboxProps } from './types.js'

/** React's figure style. */
const FIGURE_STYLE: JSX.CSSProperties = {
  margin: '0 auto',
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
/** React's caption style (the caption colour is `cm.textMuted`'s class). */
const CAPTION_STYLE: JSX.CSSProperties = {
  padding: '12px',
  'font-size': '14px',
}
/** React's "N / total" counter style (the counter colour is `cm.textMuted`'s class). */
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

  /** Navigates while the key event comes from this lightbox. */
  const navigate = (event: KitKeyboardEvent): void => {
    if (event.key === 'ArrowLeft') setIdx(index() - 1)
    else if (event.key === 'ArrowRight') setIdx(index() + 1)
  }

  return (
    <Show when={props.open && total() > 0}>
      <Modal
        open
        onClose={props.onClose ?? (() => {})}
        onKeyDown={navigate}
        size="full"
        closeLabel={t('lightbox.close', {}, { defaultValue: 'Close' })}
        aria-label={
          photo().alt ??
          t(
            'lightbox.imageOfTotal',
            { index: index() + 1, total: total() },
            { defaultValue: 'Image {{index}} of {{total}}' },
          )
        }
      >
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
          <img
            src={photo().src}
            alt={
              photo().alt ??
              t('lightbox.image', { index: index() + 1 }, { defaultValue: 'Image {{index}}' })
            }
            style={IMG_STYLE}
          />
          <Show when={photo().caption}>
            <figcaption class={cm.textMuted} style={CAPTION_STYLE}>
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
        <div class={cm.textMuted} style={COUNTER_STYLE}>
          {index() + 1} / {total()}
        </div>
      </Modal>
    </Show>
  )
}
