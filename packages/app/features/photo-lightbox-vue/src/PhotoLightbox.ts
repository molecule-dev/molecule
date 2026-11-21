/**
 * Vue fullscreen photo viewer.
 *
 * Vue counterpart of `@molecule/app-photo-lightbox-react`'s `PhotoLightbox` —
 * the same props (React names), the same ClassMap tokens, the same i18n keys,
 * and the same DOM for the same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  type PropType,
  ref,
  type VNodeChild,
  watch,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Button } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { LightboxPhoto } from './types.js'

/** React's overlay style (`position: fixed`, `z-index: 100`; the scrim is `cm.bgScrim`'s class). */
const ROOT_STYLE =
  'position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center'
/** React's figure style. */
const FIGURE_STYLE = 'margin: 0; max-width: 90vw; max-height: 90vh; text-align: center'
/** React's image style. */
const IMG_STYLE = 'max-width: 100%; max-height: 80vh; object-fit: contain'
/** React's caption style (the caption colour is `cm.textOnTone`'s class). */
const CAPTION_STYLE = 'padding: 12px; font-size: 14px'
/** React's "N / total" counter style (the counter colour is `cm.textOnTone`'s class). */
const COUNTER_STYLE =
  'position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-size: 12px'
/** React's previous-arrow style. */
const PREVIOUS_STYLE = {
  position: 'absolute',
  left: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
}
/** React's next-arrow style. */
const NEXT_STYLE = {
  position: 'absolute',
  right: '16px',
  top: '50%',
  transform: 'translateY(-50%)',
}

/**
 * Fullscreen photo viewer with prev/next arrows, keyboard navigation
 * (← → Esc), close button, and optional captions.
 *
 * @param props - Component props (see {@link PhotoLightboxProps}).
 * @returns The lightbox component, or nothing while closed or empty.
 */
export const PhotoLightbox = defineComponent({
  name: 'PhotoLightbox',
  props: {
    photos: {
      type: Array as PropType<LightboxPhoto[]>,
      required: true,
    },
    open: {
      type: Boolean,
      required: true,
    },
    onClose: {
      type: Function as PropType<() => void>,
      required: true,
    },
    initialIndex: {
      type: Number,
      default: 0,
    },
    onIndexChange: {
      type: Function as PropType<(index: number) => void>,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const index = ref(props.initialIndex)

    // React's `useEffect(() => { if (open) setIndex(initialIndex) }, [open, initialIndex])`.
    watch([() => props.open, () => props.initialIndex], () => {
      if (props.open) index.value = props.initialIndex
    })

    /** Clamps an index into the gallery (React's modulo wrap) and reports it. */
    const setIdx = (next: number): void => {
      const total = props.photos.length
      const clamped = (next + total) % total
      index.value = clamped
      props.onIndexChange?.(clamped)
    }

    /** React's document keydown handler: ← → navigate, Escape closes. */
    const onKey = (event: KeyboardEvent): void => {
      if (!props.open) return
      if (event.key === 'Escape') props.onClose()
      else if (event.key === 'ArrowLeft') setIdx(index.value - 1)
      else if (event.key === 'ArrowRight') setIdx(index.value + 1)
    }

    onMounted(() => document.addEventListener('keydown', onKey))
    onUnmounted(() => document.removeEventListener('keydown', onKey))

    return (): VNodeChild => {
      const total = props.photos.length
      if (!props.open || total === 0) return null
      const photo = props.photos[index.value]
      const closeLabel = t('lightbox.close', {}, { defaultValue: 'Close' })

      return h(
        // The overlay is a click-to-dismiss screen (role="presentation"):
        // clicking it directly closes; clicks on the controls inside do not.
        // The dialog itself is the element inside it, so Escape (handled on
        // `document` in `onKey`) stays the keyboard path.
        'div',
        {
          role: 'presentation',
          onClick: (event: MouseEvent) => {
            if (event.target === event.currentTarget) props.onClose()
          },
          class: cm.cn(cm.position('fixed'), cm.bgScrim),
          style: ROOT_STYLE,
        },
        [
          h(
            'div',
            {
              role: 'dialog',
              'aria-modal': 'true',
              'aria-label': photo.alt ?? `Image ${index.value + 1} of ${total}`,
            },
            [
              h(
                Button,
                {
                  variant: 'ghost',
                  size: 'sm',
                  onClick: props.onClose,
                  'aria-label': closeLabel,
                  className: cm.position('absolute'),
                },
                () => ['✕'],
              ),
              total > 1
                ? h(
                    Button,
                    {
                      variant: 'ghost',
                      size: 'sm',
                      onClick: () => setIdx(index.value - 1),
                      'aria-label': t('lightbox.previous', {}, { defaultValue: 'Previous' }),
                      className: cm.position('absolute'),
                      style: PREVIOUS_STYLE,
                    },
                    () => ['‹'],
                  )
                : null,
              h('figure', { style: FIGURE_STYLE }, [
                h('img', {
                  src: photo.src,
                  alt: photo.alt ?? `Image ${index.value + 1}`,
                  style: IMG_STYLE,
                }),
                photo.caption
                  ? h('figcaption', { class: cm.textOnTone, style: CAPTION_STYLE }, [photo.caption])
                  : null,
              ]),
              total > 1
                ? h(
                    Button,
                    {
                      variant: 'ghost',
                      size: 'sm',
                      onClick: () => setIdx(index.value + 1),
                      'aria-label': t('lightbox.next', {}, { defaultValue: 'Next' }),
                      className: cm.position('absolute'),
                      style: NEXT_STYLE,
                    },
                    () => ['›'],
                  )
                : null,
              h('div', { class: cm.textOnTone, style: COUNTER_STYLE }, [
                index.value + 1,
                ' / ',
                total,
              ]),
            ],
          ),
        ],
      )
    }
  },
})
