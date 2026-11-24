/**
 * Vue GPA hero card — the counterpart of
 * `@molecule/app-gradebook-react`'s `GpaCard`: the same props (React names),
 * the same ClassMap tokens, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { GpaScale, GpaTrend } from './types.js'
import { defaultGpaMax, formatGpa } from './utilities.js'

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
  if (slot) return toChildArray(slot())
  return prop != null ? toChildArray(prop) : []
}

/**
 * Hero card displaying the user's GPA — large primary value, "out of"
 * caption, and optional trend chip. Pairs with `Gradebook` above / beside the
 * table view.
 *
 * Styling routes through `getClassMap()` and all text routes through `t()`
 * via the companion `@molecule/app-locales-gradebook` locale bond.
 *
 * @param props - Component props (see {@link GpaCardProps}).
 * @returns The GPA hero card component.
 */
export const GpaCard = defineComponent({
  name: 'GpaCard',
  props: {
    gpa: { type: Number, required: true },
    scale: { type: String as PropType<GpaScale>, required: true },
    max: { type: Number, default: undefined },
    trend: { type: String as PropType<GpaTrend>, default: undefined },
    trendLabel: null,
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const ceiling =
        typeof props.max === 'number' && props.max > 0 ? props.max : defaultGpaMax(props.scale)
      const formatted = formatGpa(props.gpa, props.scale)
      const formattedMax = formatGpa(ceiling, props.scale)

      const titleText = t('gradebook.gpa.title', {}, { defaultValue: 'GPA' })
      const outOfText = t(
        'gradebook.gpa.outOf',
        { max: formattedMax },
        { defaultValue: 'out of {{max}}' },
      )

      const trendKey =
        props.trend === 'up'
          ? 'gradebook.gpa.trend.up'
          : props.trend === 'down'
            ? 'gradebook.gpa.trend.down'
            : props.trend === 'flat'
              ? 'gradebook.gpa.trend.flat'
              : null
      const trendDefault =
        props.trend === 'up' ? 'Trending up' : props.trend === 'down' ? 'Trending down' : 'Steady'
      const trendText = trendKey ? t(trendKey, {}, { defaultValue: trendDefault }) : null
      const trendGlyph = props.trend === 'up' ? '↑' : props.trend === 'down' ? '↓' : '→'

      const trendLabel = slotOrProp(slots.trendLabel, props.trendLabel)

      return h(
        Card,
        { className: props.className },
        {
          default: (): VNodeChild[] => [
            h(
              'div',
              {
                class: cm.cn(cm.stack(2 as const)),
                'data-mol-id': 'gpa-card',
                role: 'region',
                'aria-label': titleText,
              },
              [
                h(
                  'span',
                  {
                    class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')),
                    'data-mol-id': 'gpa-card-title',
                  },
                  titleText,
                ),
                h('div', { class: cm.flex({ align: 'baseline', gap: 'sm' }) }, [
                  h(
                    'span',
                    {
                      class: cm.cn(cm.textSize('3xl'), cm.fontWeight('bold')),
                      'data-mol-id': 'gpa-card-value',
                    },
                    formatted,
                  ),
                  h(
                    'span',
                    { class: cm.textSize('sm'), 'data-mol-id': 'gpa-card-out-of' },
                    outOfText,
                  ),
                ]),
                trendText
                  ? h(
                      'div',
                      {
                        class: cm.flex({ align: 'center', gap: 'sm' }),
                        'data-mol-id': 'gpa-card-trend',
                        'data-trend': props.trend,
                      },
                      [
                        h('span', { 'aria-hidden': 'true' }, trendGlyph),
                        h(
                          'span',
                          { class: cm.textSize('xs'), 'data-mol-id': 'gpa-card-trend-text' },
                          trendText,
                        ),
                        trendLabel.length > 0
                          ? h(
                              'span',
                              { class: cm.textSize('xs'), 'data-mol-id': 'gpa-card-trend-label' },
                              trendLabel,
                            )
                          : null,
                      ],
                    )
                  : null,
              ],
            ),
          ],
        },
      )
    }
  },
})
