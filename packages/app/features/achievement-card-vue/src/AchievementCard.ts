/**
 * Vue badge / achievement unlock card — the Vue counterpart of
 * `@molecule/app-achievement-card-react`'s `AchievementCard`: same props (React
 * names), same ClassMap tokens and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { AchievementCardProps } from './types.js'

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
 * Whether React would render a node prop: `tier && …` renders nothing for
 * `null`, `undefined`, `false` and the empty string, and everything else.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns True when the region renders.
 */
const renders = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): boolean => (slot ? true : prop != null && prop !== false && prop !== '')

/**
 * Badge / achievement unlock card — icon + name + description + earned state.
 * Locked achievements render greyed-out.
 *
 * @param props - Component props (see {@link AchievementCardProps}).
 * @returns The achievement card component.
 */
export const AchievementCard = defineComponent({
  name: 'AchievementCard',
  props: {
    name: null,
    description: null,
    icon: null,
    earned: { type: Boolean, default: false },
    earnedAt: null,
    earnedLabel: String,
    lockedLabel: String,
    progress: { type: Object as PropType<AchievementCardProps['progress']> },
    tier: null,
    className: String,
  },
  setup(props, { slots }) {
    const { t } = useTranslation()
    const cm = getClassMap()

    return (): VNode => {
      const earnedText =
        props.earnedLabel ?? t('achievementCard.earned', undefined, { defaultValue: 'Earned' })
      const lockedText =
        props.lockedLabel ?? t('achievementCard.locked', undefined, { defaultValue: 'Locked' })
      const iconNodes = slotOrProp(slots.icon, props.icon)
      const nameNodes = slotOrProp(slots.name, props.name)
      const tierNodes = slotOrProp(slots.tier, props.tier)
      const descriptionNodes = slotOrProp(slots.description, props.description)
      const earnedAtNodes = slotOrProp(slots.earnedAt, props.earnedAt)
      const progress = props.progress
      const progressWidth = progress
        ? `${Math.min(100, (progress.value / progress.max) * 100)}%`
        : undefined

      const status = props.earned
        ? renders(slots.earnedAt, props.earnedAt)
          ? h('span', { class: cm.textSize('xs') }, [earnedText, ' ', ...earnedAtNodes])
          : null
        : progress
          ? h('div', { class: cm.cn(cm.progress(), cm.progressHeight('sm')) }, [
              h('div', {
                class: cm.cn(cm.progressBar(), cm.progressColor('primary')),
                style: { width: progressWidth },
              }),
            ])
          : h('span', { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) }, [lockedText])

      return h(
        Card,
        {
          className: props.className,
          // React's `{ opacity: 0.5, filter: 'grayscale(0.6)' }`, written as a
          // CSS string: Vue auto-prefixes a `filter` object key to
          // `-webkit-filter`, which React never writes.
          style: !props.earned ? 'filter: grayscale(0.6); opacity: 0.5' : undefined,
        },
        {
          default: () => [
            h('div', { class: cm.flex({ align: 'start', gap: 'md' }) }, [
              h('div', { class: cm.shrink0, style: { fontSize: '36px' } }, iconNodes),
              h('div', { class: cm.cn(cm.flex1, cm.stack(1)) }, [
                h('header', { class: cm.flex({ align: 'baseline', gap: 'sm' }) }, [
                  h('h3', { class: cm.cn(cm.textSize('base'), cm.fontWeight('bold')) }, nameNodes),
                  ...(renders(slots.tier, props.tier)
                    ? [
                        h(
                          'span',
                          { class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')) },
                          tierNodes,
                        ),
                      ]
                    : []),
                ]),
                ...(renders(slots.description, props.description)
                  ? [h('p', { class: cm.textSize('sm') }, descriptionNodes)]
                  : []),
                status,
              ]),
            ]),
          ],
        },
      )
    }
  },
})
