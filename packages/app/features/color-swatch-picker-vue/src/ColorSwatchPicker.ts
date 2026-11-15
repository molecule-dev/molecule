/**
 * Vue color-swatch picker: a grid of colored circles with single-select state.
 *
 * Vue counterpart of `@molecule/app-color-swatch-picker-react`'s
 * `ColorSwatchPicker` — the same props (React names), the same ClassMap
 * tokens, and the same DOM for the same input. Used for tag colors, label
 * colors, theme accent swatches, etc.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

import type { ColorSwatchPickerProps } from './types.js'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
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
 * Grid of colored circles with single-select state. Each swatch renders as a
 * `role="radio"` button sized by `size` (default 28) and painted with its own
 * `color` — the one inline style that is the caller's data, not a design
 * token; a `cm.button()` fill would hide it.
 *
 * @param props - Component props (see {@link ColorSwatchPickerProps}).
 * @returns The swatch picker component.
 */
export const ColorSwatchPicker = defineComponent({
  name: 'ColorSwatchPicker',
  props: {
    swatches: {
      type: Array as PropType<ColorSwatchPickerProps['swatches']>,
      required: true,
    },
    value: { type: String, required: true },
    onChange: Function as PropType<ColorSwatchPickerProps['onChange']>,
    size: { type: Number, default: 28 },
    gap: {
      type: String as PropType<'xs' | 'sm' | 'md'>,
      default: 'sm',
    },
    preview: null,
    className: String,
    ariaLabel: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode =>
      h('div', { class: cm.cn(cm.stack(2), props.className) }, [
        h(
          'div',
          {
            role: 'radiogroup',
            'aria-label': props.ariaLabel,
            class: cm.flex({ align: 'center', gap: props.gap, wrap: 'wrap' }),
          },
          props.swatches.map((s) => {
            const selected = s.value === props.value
            return h('button', {
              key: s.value,
              type: 'button',
              role: 'radio',
              'aria-checked': selected ? 'true' : 'false',
              'aria-label': s.label ?? s.value,
              'data-mol-id': `color-swatch-${s.value}`,
              'data-selected': selected ? 'true' : 'false',
              onClick: () => props.onChange?.(s.value),
              /* mol-bespoke-button: colour swatch, no label — the inline
                 background IS the caller's data (the colour being picked), not
                 a design token, and a `cm.button()` fill would hide it. Cursor
                 and the compact touch floor come from the ClassMap. */
              class: cm.cn(cm.roundedFull, cm.cursorPointer, cm.touchTargetCompact),
              style: {
                width: `${props.size}px`,
                height: `${props.size}px`,
                background: s.color,
                outline: selected ? '2px solid currentColor' : 'none',
                outlineOffset: '2px',
                border: 'none',
              },
            })
          }),
        ),
        ...slotOrProp(slots.preview, props.preview),
      ])
  },
})
