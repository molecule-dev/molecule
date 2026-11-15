/**
 * Vue `<Card>`-wrapped progress display — the Vue counterpart of
 * `@molecule/app-progress-bar-react`'s `ProgressCard`: the same props (React
 * names), the same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'

import { ProgressBar } from './ProgressBar.js'
import type { ProgressCardProps } from './types.js'

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
 * Whether React would render a node prop: `description && …` renders nothing
 * for `null`, `undefined`, `false`, `0` and the empty string, and everything
 * else.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns True when the region renders.
 */
const renders = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): boolean => (slot ? true : !!prop)

/**
 * `<Card>`-wrapped progress display with title, optional icon and description,
 * the progress bar itself, and an optional extras slot below. Useful for
 * budget/goal cards, storage-used panels, onboarding progress, etc.
 *
 * @param props - Component props (see {@link ProgressCardProps}).
 * @returns The progress card component.
 */
export const ProgressCard = defineComponent({
  name: 'ProgressCard',
  props: {
    title: null,
    description: null,
    icon: null,
    value: { type: Number, required: true },
    max: { type: Number, default: 100 },
    valueLabel: null,
    color: {
      type: String as PropType<ProgressCardProps['color']>,
      default: 'primary',
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return (): VNode => {
      const iconNodes = slotOrProp(slots.icon, props.icon)
      const titleNodes = slotOrProp(slots.title, props.title)
      const descriptionNodes = slotOrProp(slots.description, props.description)
      const valueLabelNodes = slotOrProp(slots.valueLabel, props.valueLabel)
      const hasDescription = renders(slots.description, props.description)
      const hasValueLabel = renders(slots.valueLabel, props.valueLabel)

      return h(
        Card,
        { className: props.className },
        {
          default: () => [
            h('div', { class: cm.stack(3) }, [
              h('div', { class: cm.flex({ justify: 'between', align: 'start', gap: 'sm' }) }, [
                h('div', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
                  ...iconNodes,
                  h('div', null, [
                    h(
                      'h3',
                      { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) },
                      titleNodes,
                    ),
                    hasDescription ? h('p', { class: cm.textSize('sm') }, descriptionNodes) : null,
                  ]),
                ]),
                hasValueLabel
                  ? h(
                      'span',
                      { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
                      valueLabelNodes,
                    )
                  : null,
              ]),
              h(ProgressBar, { value: props.value, max: props.max, color: props.color }),
              ...slotOrProp(slots.default, null),
            ]),
          ],
        },
      )
    }
  },
})
