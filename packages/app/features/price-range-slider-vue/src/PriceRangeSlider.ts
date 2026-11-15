/**
 * PriceRangeSlider component (React parity).
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render, or null when neither is present.
 */
const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] | null => {
  if (slot) return slot()
  return prop != null ? [prop] : null
}

/**
 * PriceRangeSlider component.
 *
 * Dual-handle numeric range slider using two native `<input type="range">`
 * controls. Apps supply min/max/step and a `formatValue` to render the
 * endpoint labels (typical use: currency-formatted prices). The handles clamp
 * against each other so `low <= high` always holds. This is the Vue
 * counterpart of `@molecule/app-price-range-slider-react`'s `PriceRangeSlider`:
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 */
export const PriceRangeSlider = defineComponent({
  name: 'PriceRangeSlider',
  props: {
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    value: {
      type: Object as PropType<[number, number]>,
      required: true,
    },
    step: { type: Number, default: 1 },
    formatValue: {
      type: Function as PropType<(n: number) => string>,
      default: undefined,
    },
    label: null,
    className: String,
  },
  emits: {
    /** Called whenever either handle moves (React's `onChange`). */
    change: (value: [number, number]) => Array.isArray(value),
  },
  setup(props, { emit, slots }) {
    const cm = getClassMap()
    const low = (): number => props.value[0]
    const high = (): number => props.value[1]
    /**
     * Formats an endpoint label: the caller's `formatValue`, else the USD
     * default (`$1,000`).
     *
     * @param n - The endpoint value.
     * @returns The formatted label.
     */
    const fmt = (n: number): string =>
      props.formatValue ? props.formatValue(n) : `$${n.toLocaleString()}`
    // React's range-input `onChange` fires on the native `input` event, and a
    // controlled input is restored to the prop value right after the change
    // handler returns.
    const onMinInput = (event: Event): void => {
      const element = event.target as HTMLInputElement
      emit('change', [Math.min(Number(element.value), high()), high()])
      element.value = String(low())
    }
    const onMaxInput = (event: Event): void => {
      const element = event.target as HTMLInputElement
      emit('change', [low(), Math.max(Number(element.value), low())])
      element.value = String(high())
    }

    return (): VNode => {
      const label = slotOrProp(slots.label, props.label as VNodeChild | null | undefined)
      return h('div', { class: cm.cn(cm.stack(2), props.className) }, [
        label
          ? h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, label)
          : null,
        h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
          h('span', { class: cm.textSize('sm') }, [fmt(low())]),
          h('input', {
            type: 'range',
            min: props.min,
            max: props.max,
            step: props.step,
            value: low(),
            onInput: onMinInput,
            class: cm.flex1,
            'aria-label': 'Minimum',
          }),
          h('input', {
            type: 'range',
            min: props.min,
            max: props.max,
            step: props.step,
            value: high(),
            onInput: onMaxInput,
            class: cm.flex1,
            'aria-label': 'Maximum',
          }),
          h('span', { class: cm.textSize('sm') }, [fmt(high())]),
        ]),
      ])
    }
  },
})
