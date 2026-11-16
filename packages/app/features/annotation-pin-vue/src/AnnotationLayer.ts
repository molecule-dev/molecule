/**
 * Vue annotation layer — a surface with many pin markers overlaid on it.
 *
 * Vue counterpart of `@molecule/app-annotation-pin-react`'s
 * `AnnotationLayer` — the same props (React names), the same ClassMap tokens,
 * the same i18n keys, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { AnnotationPin } from './AnnotationPin.js'
import type { Pin } from './types.js'

/**
 * Wrapper that manages multiple pins on a parent surface. Renders its
 * default slot (the surface — typically an `<img>`, `<canvas>`, or
 * map-tile element) and overlays each `pins[]` entry as a clickable
 * `<AnnotationPin>` marker.
 *
 * Click behaviour:
 * - clicking a pin marker fires `onPinClick(pinId)`
 * - clicking empty space on the layer fires `onSurfaceClick({ x, y })`,
 *   which callers typically use to add a new pin. That action lives on
 *   an invisible "add annotation pin" button covering the surface (the
 *   layer region itself is not interactive — it contains the pin
 *   buttons and popups): pointer clicks place a pin at the click
 *   position; activating the button with a keyboard (Tab to it, then
 *   Enter / Space) or assistive tech places a pin at the surface centre.
 *
 * The layer itself sets `position: relative` so absolute pin
 * positioning works without the caller having to provide a wrapper.
 *
 * All styling routes through `getClassMap()`; all user-visible text
 * routes through `t()` so the layer translates via the companion
 * `@molecule/app-locales-annotation-pin` locale bond.
 *
 * @param props - Component props (see {@link AnnotationLayerProps}).
 * @returns The annotation-layer component.
 */
export const AnnotationLayer = defineComponent({
  name: 'AnnotationLayer',
  props: {
    pins: {
      type: Array as PropType<Pin[]>,
      required: true,
    },
    activePinId: {
      type: String as PropType<string | null | undefined>,
      default: undefined,
    },
    onPinClick: {
      type: Function as PropType<(pinId: string) => void>,
      default: undefined,
    },
    onSurfaceClick: {
      type: Function as PropType<(position: { x: number; y: number }) => void>,
      default: undefined,
    },
    normalised: {
      type: Boolean,
      default: true,
    },
    popupSide: {
      type: String as PropType<'top' | 'bottom' | 'left' | 'right'>,
      default: 'right',
    },
    className: String,
    style: {
      type: Object as PropType<Record<string, string | number>>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * Computes the clicked position relative to the add-pin button's box
     * (which covers the layer) and forwards to `onSurfaceClick`. If
     * `normalised` is `true`, the returned coordinates are 0..1
     * fractions; otherwise they are raw pixel offsets.
     *
     * Clicks produced by keyboard activation (Enter / Space on the
     * focused button) or assistive tech carry `detail === 0` and no
     * pointer position — such clicks place the pin at the surface centre.
     * Pin markers and popups never reach this handler: they stack above
     * the button and are its siblings, so their clicks do not hit it.
     *
     * @param event - The originating mouse event.
     */
    const handleSurfaceClick = (event: MouseEvent): void => {
      if (!props.onSurfaceClick) return
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
      const keyboardActivated = event.detail === 0
      const px = keyboardActivated ? rect.width / 2 : event.clientX - rect.left
      const py = keyboardActivated ? rect.height / 2 : event.clientY - rect.top
      const safeRectWidth = rect.width || 1
      const safeRectHeight = rect.height || 1
      const x = props.normalised ? px / safeRectWidth : px
      const y = props.normalised ? py / safeRectHeight : py
      props.onSurfaceClick({ x, y })
    }

    return (): VNodeChild => {
      const content: VNodeChild[] = slots.default ? slots.default() : []
      if (props.onSurfaceClick)
        content.push(
          h('button', {
            type: 'button',
            'aria-label': t(
              'annotationPin.aria.addPin',
              {},
              { defaultValue: 'Add annotation pin' },
            ),
            'data-mol-id': 'annotation-layer-add-pin',
            onClick: handleSurfaceClick,
            class: cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer),
            // Reset the browser's default button chrome — the add-pin button
            // is an invisible full-surface target, not a visible control.
            style: { border: 'none', padding: '0px', background: 'transparent' },
          }),
        )
      for (const pin of props.pins)
        content.push(
          h(AnnotationPin, {
            key: pin.id,
            position: pin.position,
            label: pin.label,
            note: pin.note,
            selected: props.activePinId === pin.id,
            popupSide: props.popupSide,
            normalised: props.normalised,
            onClick: () => props.onPinClick?.(pin.id),
          }),
        )

      return h(
        'div',
        {
          role: 'region',
          'aria-label': t('annotationPin.aria.layer', {}, { defaultValue: 'Annotation layer' }),
          'data-mol-id': 'annotation-layer',
          class: cm.cn(props.className),
          style: {
            position: 'relative',
            width: '100%',
            height: '100%',
            ...(props.style ?? {}),
          },
        },
        content,
      )
    }
  },
})
