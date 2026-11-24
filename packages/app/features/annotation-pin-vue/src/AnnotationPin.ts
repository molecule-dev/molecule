/**
 * Vue annotation pin marker — a click-to-toggle marker with a label and a
 * note popup.
 *
 * Vue counterpart of `@molecule/app-annotation-pin-react`'s `AnnotationPin` —
 * the same props (React names), the same ClassMap tokens, the same i18n keys,
 * and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: a
 * prop that was given wins (React's single source of truth — a later `null`
 * removes the node, as React does), and the slot is used only while the prop
 * is absent. An absent pair contributes nothing.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The slot render function, when the caller passed the slot.
 * @returns The children to render.
 */
const nodeValue = (prop: VNodeChild, slot: (() => VNodeChild[]) | undefined): VNodeChild[] => {
  if (prop !== undefined) return prop === null ? [] : [prop]
  if (slot) return slot()
  return []
}

/**
 * A single pin marker (small circle with optional `label`) rendered at
 * an absolute position on its parent. Clicking the marker toggles its
 * popup (which shows the `note` body) via the `onClick` handler.
 *
 * Positioning is absolute relative to the nearest positioned ancestor —
 * callers must wrap the surface (image, canvas, map) in a
 * `position: relative` element. `AnnotationLayer` provides this
 * wrapper automatically.
 *
 * All styling routes through `getClassMap()`; all user-visible text
 * (aria-labels, fallback note text) routes through `t()` so the marker
 * translates via the companion `@molecule/app-locales-annotation-pin`
 * locale bond.
 *
 * @param props - Component props (see {@link AnnotationPinProps}).
 * @returns The pin component.
 */
export const AnnotationPin = defineComponent({
  name: 'AnnotationPin',
  props: {
    position: {
      type: Object as PropType<{ x: number; y: number }>,
      required: true,
    },
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, a number, or `null` to hide).
    label: null,
    note: null,
    selected: {
      type: Boolean,
      default: false,
    },
    onClick: {
      type: Function as PropType<() => void>,
      default: undefined,
    },
    popupSide: {
      type: String as PropType<'top' | 'bottom' | 'left' | 'right'>,
      default: 'right',
    },
    className: String,
    normalised: {
      type: Boolean,
      default: true,
    },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * The popup body: the note when it was given (a null note renders an
     * empty body, as React's `note ?? …` does), otherwise the translated
     * empty-state line.
     *
     * @returns The popup body's children.
     */
    const noteContent = (): VNodeChild[] => {
      const fromProp: VNodeChild[] =
        props.note !== undefined && props.note !== null ? [props.note] : []
      // A note passed as the same-named slot wins over the empty state, and a
      // note that renders nothing falls back to it (React's `slot(note) ?? …`).
      const nodes = props.note === undefined && slots.note ? slots.note() : fromProp
      if (toChildArray(nodes).length > 0) return nodes
      return [
        h(
          'span',
          { 'data-mol-id': 'annotation-pin-popup-empty' },
          t('annotationPin.empty', {}, { defaultValue: 'No notes for this pin.' }),
        ),
      ]
    }

    /**
     * The popup's side-specific inline style (React's `popupStyle`).
     *
     * @param side - The popup side.
     * @returns The inline style.
     */
    const popupStyle = (side: string): Record<string, string | number> => {
      const base: Record<string, string | number> = {
        position: 'absolute',
        minWidth: '160px',
        maxWidth: '240px',
        padding: '8px',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
        zIndex: 3,
      }
      switch (side) {
        case 'top':
          base.bottom = '100%'
          base.left = '50%'
          base.transform = 'translate(-50%, -8px)'
          break
        case 'bottom':
          base.top = '100%'
          base.left = '50%'
          base.transform = 'translate(-50%, 8px)'
          break
        case 'left':
          base.right = '100%'
          base.top = '50%'
          base.transform = 'translate(-8px, -50%)'
          break
        case 'right':
        default:
          base.left = '100%'
          base.top = '50%'
          base.transform = 'translate(8px, -50%)'
          break
      }
      return base
    }

    /**
     * Stops the marker click from bubbling to arbitrary ancestor click
     * handlers and forwards it to `onClick`.
     *
     * @param event - The originating mouse event.
     */
    const handleMarkerClick = (event: MouseEvent): void => {
      event.stopPropagation()
      if (props.onClick) props.onClick()
    }

    return (): VNodeChild => {
      const x = props.normalised ? `${props.position.x * 100}%` : `${props.position.x}px`
      const y = props.normalised ? `${props.position.y * 100}%` : `${props.position.y}px`

      return h(
        'div',
        {
          class: cm.cn(props.className),
          'data-mol-id': 'annotation-pin',
          'data-pin-selected': props.selected ? 'true' : 'false',
          style: {
            position: 'absolute',
            left: x,
            top: y,
            transform: 'translate(-50%, -50%)',
            zIndex: props.selected ? 2 : 1,
          },
        },
        [
          h(
            'button',
            {
              type: 'button',
              onClick: handleMarkerClick,
              'aria-label': t('annotationPin.aria.marker', {}, { defaultValue: 'Annotation pin' }),
              'aria-expanded': props.selected ? 'true' : 'false',
              'data-mol-id': 'annotation-pin-marker',
              class: cm.cn(cm.roundedFull, cm.cursorPointer),
              style: {
                width: '24px',
                height: '24px',
                border: 'none',
                padding: '0px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              },
            },
            [
              h(
                'span',
                {
                  class: cm.cn(cm.textSize('xs'), cm.fontWeight('bold')),
                  'data-mol-id': 'annotation-pin-label',
                  style: { lineHeight: 1, pointerEvents: 'none' },
                },
                nodeValue(props.label, slots.label),
              ),
            ],
          ),
          props.selected
            ? h(
                'div',
                {
                  role: 'dialog',
                  'aria-label': t(
                    'annotationPin.aria.popup',
                    {},
                    { defaultValue: 'Annotation details' },
                  ),
                  'data-mol-id': 'annotation-pin-popup',
                  'data-popup-side': props.popupSide,
                  class: cm.cn(cm.surface, cm.borderAll, cm.textSize('sm')),
                  style: popupStyle(props.popupSide),
                },
                [h('div', { 'data-mol-id': 'annotation-pin-popup-body' }, noteContent())],
              )
            : null,
        ],
      )
    }
  },
})
