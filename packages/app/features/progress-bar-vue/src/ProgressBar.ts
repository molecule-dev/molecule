/**
 * Vue labeled progress bar — the Vue counterpart of
 * `@molecule/app-progress-bar-react`'s `ProgressBar`: the same props (React
 * names), the same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, useId, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { ProgressBarProps } from './types.js'

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
 * Whether React would render a node prop: `label && …` renders nothing for
 * `null`, `undefined`, `false`, `0` and the empty string, and everything else.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns True when the region renders.
 */
const renders = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): boolean => (slot ? toChildArray(slot()).length > 0 : toChildArray(prop).length > 0)

/** The fill percentage React computes: `max === 0 ? 0 : clamp(0, 100, value / max * 100)`. */
const fillPercent = (value: number, max: number): number =>
  max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100))

/**
 * Labeled progress bar with optional value display.
 *
 * Renders a `[label ... valueLabel]` header row above a track. The track
 * itself uses the wired ClassMap progress tokens — swap the ClassMap bond
 * to restyle without touching this component.
 *
 * The track always carries an accessible name (`aria-progressbar-name`):
 * `labelledBy` when given, else the rendered `label`, else
 * `t('progressBar.label', undefined, { defaultValue: 'Progress' })`, read
 * through `useTranslation()` so it follows a locale switch.
 *
 * @param props - Component props (see {@link ProgressBarProps}).
 * @returns The progress bar component.
 */
export const ProgressBar = defineComponent({
  name: 'ProgressBar',
  props: {
    value: { type: Number, required: true },
    max: { type: Number, default: 100 },
    label: null,
    valueLabel: null,
    labelledBy: String,
    describedBy: String,
    size: {
      type: String as PropType<ProgressBarProps['size']>,
      default: 'md',
    },
    color: {
      type: String as PropType<ProgressBarProps['color']>,
      default: 'primary',
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const nameId = useId()

    return (): VNode => {
      const labelNodes = slotOrProp(slots.label, props.label)
      const valueLabelNodes = slotOrProp(slots.valueLabel, props.valueLabel)
      const hasLabel = renders(slots.label, props.label)
      const hasValueLabel = renders(slots.valueLabel, props.valueLabel)
      // The rendered label is the track's name unless an explicit labelledBy wins.
      const namedByLabel = props.labelledBy === undefined && hasLabel
      const labelId = namedByLabel ? nameId : undefined

      return h('div', { class: cm.cn(cm.stack(2), props.className) }, [
        hasLabel || hasValueLabel
          ? h('div', { class: cm.flex({ justify: 'between', align: 'center' }) }, [
              hasLabel
                ? h(
                    'span',
                    { id: labelId, class: cm.cn(cm.textSize('sm'), cm.fontWeight('medium')) },
                    labelNodes,
                  )
                : null,
              hasValueLabel ? h('span', { class: cm.textSize('sm') }, valueLabelNodes) : null,
            ])
          : null,
        h(
          'div',
          {
            class: cm.cn(cm.progress(), cm.progressHeight(props.size)),
            role: 'progressbar',
            'aria-valuenow': props.value,
            'aria-valuemin': 0,
            'aria-valuemax': props.max,
            'aria-labelledby': props.labelledBy ?? labelId,
            'aria-label':
              props.labelledBy === undefined && !hasLabel
                ? t('progressBar.label', undefined, { defaultValue: 'Progress' })
                : undefined,
            'aria-describedby': props.describedBy,
          },
          [
            h('div', {
              class: cm.cn(cm.progressBar(), cm.progressColor(props.color)),
              style: { width: `${fillPercent(props.value, props.max)}%` },
            }),
          ],
        ),
      ])
    }
  },
})
