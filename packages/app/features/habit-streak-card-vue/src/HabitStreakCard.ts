/**
 * Vue habit / streak summary card — current streak, best streak, total
 * completions, and an optional per-day heatmap strip.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { StreakDay } from './types.js'

/**
 * Returns a green rgba color whose opacity scales with completion intensity.
 *
 * @param count - The day's completion count.
 * @param max - The largest count in the rendered heatmap window.
 * @returns The CSS background color.
 */
function intensityColor(count: number, max: number): string {
  if (count === 0) return 'rgba(0,0,0,0.08)'
  const t = Math.min(1, count / Math.max(1, max))
  // simple green ramp
  return `rgba(34,197,94,${0.25 + 0.75 * t})`
}

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * prop when the caller passed one, otherwise the slot, otherwise nothing.
 *
 * @param value - The prop's value, when the caller passed the prop.
 * @param slot - The same-named slot's render function, when provided.
 * @returns The children to render.
 */
const nodeOrSlot = (
  value: VNodeChild | null | undefined,
  slot: (() => VNodeChild[]) | undefined,
): VNodeChild[] => {
  if (value !== undefined && value !== null && value !== false && value !== '') return [value]
  return slot ? slot() : []
}

/**
 * Habit / streak summary card with current + best streak, total completions,
 * and an optional heatmap strip.
 *
 * Vue counterpart of `@molecule/app-habit-streak-card-react`'s
 * `HabitStreakCard` — the same props (React names), the same ClassMap tokens
 * and the same DOM for the same input. The stat labels and the heatmap's
 * strip and day labels go through `useTranslation()` with React's exact keys
 * and English defaults, and `heatmapDays` truncates `heatmap` from the end
 * (most recent days win).
 *
 * @param props - Component props (see {@link HabitStreakCardProps} in
 *   `./types.js`).
 * @returns The habit streak card component.
 */
export const HabitStreakCard = defineComponent({
  name: 'HabitStreakCard',
  props: {
    // Node-valued props: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or `null`).
    name: { type: null, required: true },
    icon: { type: null },
    currentStreak: { type: Number, required: true },
    bestStreak: { type: Number },
    totalCompletions: { type: Number },
    heatmap: { type: Array as PropType<StreakDay[]> },
    heatmapDays: { type: Number, default: 30 },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()

    /**
     * One heatmap square's accessible label and tooltip (`<date>: <count>`).
     *
     * @param day - The day.
     * @returns Its label.
     */
    const dayLabel = (day: StreakDay): string =>
      t(
        'habit.cell.tooltip',
        { date: day.date, count: day.count },
        {
          defaultValue: '{{date}}: {{count}}',
        },
      )

    return (): VNode => {
      const days = (props.heatmap ?? []).slice(-props.heatmapDays)
      const max = days.reduce((m, d) => Math.max(m, d.count), 0)
      return h(Card, { className: props.className }, () => [
        h('div', { class: cm.stack(3) }, [
          h('header', { class: cm.flex({ align: 'center', gap: 'sm' }) }, [
            ...nodeOrSlot(props.icon, slots.icon),
            h(
              'h3',
              { class: cm.cn(cm.textSize('base'), cm.fontWeight('semibold')) },
              nodeOrSlot(props.name, slots.name),
            ),
          ]),
          h('div', { class: cm.flex({ align: 'baseline', gap: 'lg' }) }, [
            h('div', {}, [
              h('div', { class: cm.cn(cm.textSize('3xl'), cm.fontWeight('bold')) }, [
                String(props.currentStreak),
              ]),
              h('div', { class: cm.textSize('xs') }, [
                t('habit.currentStreak', {}, { defaultValue: 'day streak' }),
              ]),
            ]),
            props.bestStreak !== undefined
              ? h('div', {}, [
                  h('div', { class: cm.cn(cm.textSize('lg'), cm.fontWeight('semibold')) }, [
                    String(props.bestStreak),
                  ]),
                  h('div', { class: cm.textSize('xs') }, [
                    t('habit.bestStreak', {}, { defaultValue: 'best' }),
                  ]),
                ])
              : null,
            props.totalCompletions !== undefined
              ? h('div', {}, [
                  h('div', { class: cm.cn(cm.textSize('lg'), cm.fontWeight('semibold')) }, [
                    String(props.totalCompletions),
                  ]),
                  h('div', { class: cm.textSize('xs') }, [
                    t('habit.total', {}, { defaultValue: 'total' }),
                  ]),
                ])
              : null,
          ]),
          days.length > 0
            ? h(
                'div',
                {
                  class: cm.flex({ align: 'center', gap: 'xs' }),
                  role: 'group',
                  'aria-label': t(
                    'habit.aria.recentActivity',
                    {},
                    { defaultValue: 'Recent activity' },
                  ),
                },
                days.map((d) =>
                  h('span', {
                    key: d.date,
                    role: 'img',
                    'aria-label': dayLabel(d),
                    title: dayLabel(d),
                    style: {
                      width: '10px',
                      height: '10px',
                      borderRadius: '2px',
                      background: intensityColor(d.count, max),
                    },
                  }),
                ),
              )
            : null,
        ]),
      ])
    }
  },
})
