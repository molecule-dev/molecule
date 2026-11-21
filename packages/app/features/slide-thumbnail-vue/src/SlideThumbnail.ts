/**
 * Vue slide thumbnail tile for presentation editors / slideshow navigators.
 *
 * Vue counterpart of `@molecule/app-slide-thumbnail-react`'s `SlideThumbnail` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input. The live scaled-down preview is the default slot (or the
 * same-named prop).
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { SlideThumbnailProps } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as the default slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The default slot render function, when the caller filled it.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  if (slot) return slot()
  return prop != null ? [prop] : []
}

/**
 * Slide thumbnail tile for presentation editors / slideshow navigators.
 * Apps render the live scaled-down preview as the default slot; this
 * component provides the surrounding chrome (active outline + index label).
 *
 * @param props - Component props (see {@link SlideThumbnailProps}).
 * @returns The slide thumbnail component.
 */
export const SlideThumbnail = defineComponent({
  name: 'SlideThumbnail',
  props: {
    index: { type: Number, required: true },
    children: null,
    active: { type: Boolean, default: false },
    onClick: {
      type: Function as PropType<SlideThumbnailProps['onClick']>,
      default: undefined,
    },
    aspect: {
      type: String as PropType<'16/9' | '4/3' | '1/1'>,
      default: '16/9',
    },
    width: { type: Number, default: 160 },
    className: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode =>
      h(
        'button',
        {
          type: 'button',
          onClick: (event: MouseEvent) => props.onClick?.(event),
          'aria-current': props.active ? 'true' : undefined,
          'data-mol-id': 'slide-thumbnail',
          'data-slide-index': props.index,
          'aria-label': t(
            'slideThumbnail.label',
            { index: props.index },
            { defaultValue: 'Slide {{index}}' },
          ),
          class: cm.cn(cm.position('relative'), cm.cursorPointer, cm.surface, props.className),
          style: {
            width: `${props.width}px`,
            aspectRatio: props.aspect.replace('/', ' / '),
            outline: props.active ? '2px solid currentColor' : 'none',
            outlineOffset: '2px',
            overflow: 'hidden',
            border: 'none',
            padding: '0',
          },
        },
        [
          ...slotOrProp(slots.default, props.children),
          h(
            'span',
            {
              class: cm.cn(cm.bgScrim, cm.textOnTone),
              style: {
                position: 'absolute',
                left: '4px',
                top: '4px',
                padding: '0 4px',
                fontSize: '10px',
                fontWeight: '700',
                borderRadius: '3px',
              },
            },
            String(props.index),
          ),
        ],
      )
  },
})
