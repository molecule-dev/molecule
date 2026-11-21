/**
 * Vue anatomical muscle-group badge: a body-silhouette glyph with the
 * targeted muscle highlighted, plus a translated label.
 *
 * Vue counterpart of `@molecule/app-muscle-group-badge-react`'s
 * `MuscleGroupBadge` — the same props (React names), the same ClassMap tokens
 * and inline styles, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode } from 'vue'

import type { TranslateFunction } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { MuscleGroup, MuscleGroupBadgeProps } from './types.js'

/**
 * Hex accent color per group — the group's own category palette (data), not a
 * theme tone; overridable via `accentColor`.
 */
const ACCENT: Record<MuscleGroup, string> = {
  chest: '#ef4444',
  back: '#3b82f6',
  shoulders: '#8b5cf6',
  biceps: '#ec4899',
  triceps: '#f97316',
  forearms: '#f59e0b',
  core: '#10b981',
  glutes: '#a855f7',
  quads: '#14b8a6',
  hamstrings: '#06b6d4',
  calves: '#84cc16',
  fullBody: '#6366f1',
}

/** Glyph pixel size per display size. */
const SIZE_PX: Record<NonNullable<MuscleGroupBadgeProps['size']>, number> = {
  sm: 32,
  md: 48,
  lg: 72,
}

/**
 * Default English label for a muscle group — the same string each group's
 * literal `t()` default surfaces. Exposed for tests and downstream consumers
 * that need to label buttons / menus / search filters by group.
 *
 * @param group - The muscle group.
 * @returns A short, capitalized English label.
 */
export function defaultLabelFor(group: MuscleGroup): string {
  switch (group) {
    case 'chest':
      return 'Chest'
    case 'back':
      return 'Back'
    case 'shoulders':
      return 'Shoulders'
    case 'biceps':
      return 'Biceps'
    case 'triceps':
      return 'Triceps'
    case 'forearms':
      return 'Forearms'
    case 'core':
      return 'Core'
    case 'glutes':
      return 'Glutes'
    case 'quads':
      return 'Quads'
    case 'hamstrings':
      return 'Hamstrings'
    case 'calves':
      return 'Calves'
    case 'fullBody':
      return 'Full body'
  }
}

/**
 * Translated label for a muscle group — one literal `t()` call per group, so
 * the i18n gate can verify every key this lookup can produce against the
 * `@molecule/app-locales-muscle-group-badge` bond; a key built at runtime from
 * the group value would be invisible to it.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param group - The muscle group to label.
 * @returns The label in the active locale, or the group's English default.
 */
function translatedLabel(t: TranslateFunction, group: MuscleGroup): string {
  switch (group) {
    case 'chest':
      return t('muscleGroupBadge.group.chest', {}, { defaultValue: 'Chest' })
    case 'back':
      return t('muscleGroupBadge.group.back', {}, { defaultValue: 'Back' })
    case 'shoulders':
      return t('muscleGroupBadge.group.shoulders', {}, { defaultValue: 'Shoulders' })
    case 'biceps':
      return t('muscleGroupBadge.group.biceps', {}, { defaultValue: 'Biceps' })
    case 'triceps':
      return t('muscleGroupBadge.group.triceps', {}, { defaultValue: 'Triceps' })
    case 'forearms':
      return t('muscleGroupBadge.group.forearms', {}, { defaultValue: 'Forearms' })
    case 'core':
      return t('muscleGroupBadge.group.core', {}, { defaultValue: 'Core' })
    case 'glutes':
      return t('muscleGroupBadge.group.glutes', {}, { defaultValue: 'Glutes' })
    case 'quads':
      return t('muscleGroupBadge.group.quads', {}, { defaultValue: 'Quads' })
    case 'hamstrings':
      return t('muscleGroupBadge.group.hamstrings', {}, { defaultValue: 'Hamstrings' })
    case 'calves':
      return t('muscleGroupBadge.group.calves', {}, { defaultValue: 'Calves' })
    case 'fullBody':
      return t('muscleGroupBadge.group.fullBody', {}, { defaultValue: 'Full body' })
  }
}

/**
 * The highlight region of a group, in the glyph's 24x24 viewBox.
 *
 * @param group - The muscle group to highlight.
 * @param accent - Accent color CSS value.
 * @returns The highlight VNode.
 */
const highlightFor = (group: MuscleGroup, accent: string): VNode => {
  switch (group) {
    case 'chest':
      return h('rect', { x: '9', y: '6.5', width: '6', height: '3', rx: '1', fill: accent })
    case 'back':
      return h('rect', { x: '9', y: '7', width: '6', height: '4', rx: '1', fill: accent })
    case 'shoulders':
      return h('g', { fill: accent }, [
        h('circle', { cx: '8.5', cy: '6.5', r: '1.4' }),
        h('circle', { cx: '15.5', cy: '6.5', r: '1.4' }),
      ])
    case 'biceps':
      return h('g', { fill: accent }, [
        h('rect', { x: '6', y: '7.5', width: '2', height: '3.5', rx: '1' }),
        h('rect', { x: '16', y: '7.5', width: '2', height: '3.5', rx: '1' }),
      ])
    case 'triceps':
      return h('g', { fill: accent }, [
        h('rect', { x: '5.5', y: '9', width: '2', height: '3', rx: '1' }),
        h('rect', { x: '16.5', y: '9', width: '2', height: '3', rx: '1' }),
      ])
    case 'forearms':
      return h('g', { fill: accent }, [
        h('rect', { x: '5', y: '11', width: '1.8', height: '3', rx: '0.6' }),
        h('rect', { x: '17.2', y: '11', width: '1.8', height: '3', rx: '0.6' }),
      ])
    case 'core':
      return h('rect', { x: '10', y: '10.5', width: '4', height: '4', rx: '0.8', fill: accent })
    case 'glutes':
      return h('rect', { x: '9', y: '14', width: '6', height: '2.5', rx: '1', fill: accent })
    case 'quads':
      return h('g', { fill: accent }, [
        h('rect', { x: '9', y: '16', width: '2.5', height: '4', rx: '0.8' }),
        h('rect', { x: '12.5', y: '16', width: '2.5', height: '4', rx: '0.8' }),
      ])
    case 'hamstrings':
      return h('g', { fill: accent }, [
        h('rect', { x: '9', y: '17', width: '2.5', height: '3', rx: '0.8', opacity: '0.85' }),
        h('rect', { x: '12.5', y: '17', width: '2.5', height: '3', rx: '0.8', opacity: '0.85' }),
      ])
    case 'calves':
      return h('g', { fill: accent }, [
        h('rect', { x: '9.5', y: '20', width: '2', height: '2.5', rx: '0.6' }),
        h('rect', { x: '12.5', y: '20', width: '2', height: '2.5', rx: '0.6' }),
      ])
    case 'fullBody':
      return h('rect', {
        x: '6',
        y: '3',
        width: '12',
        height: '19',
        rx: '2',
        fill: accent,
        'fill-opacity': '0.2',
      })
  }
}

/**
 * Tiny anatomical glyph — a stylized human silhouette with the active muscle
 * group highlighted by `accent`. Pure SVG, no images.
 *
 * @param group - The muscle group to highlight.
 * @param accent - Accent color CSS value.
 * @param size - Pixel size of the glyph (square).
 * @returns The rendered SVG.
 */
const MuscleGlyph = (group: MuscleGroup, accent: string, size: number): VNode =>
  h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    [
      // Body silhouette — head + torso + limbs.
      h(
        'g',
        {
          fill: 'currentColor',
          'fill-opacity': '0.12',
          stroke: 'currentColor',
          'stroke-opacity': '0.4',
        },
        [
          h('circle', { cx: '12', cy: '3.5', r: '2' }),
          h('path', {
            d: 'M7 6 h10 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 h-2 v5 h-2 v-5 h-2 v5 h-2 v-5 h-2 a1 1 0 0 1 -1 -1 v-9 a1 1 0 0 1 1 -1 z',
          }),
        ],
      ),
      highlightFor(group, accent),
    ],
  )

/**
 * Anatomical muscle-group badge — a small body-silhouette glyph with the
 * targeted muscle highlighted, plus a translated label. Used by
 * workout-tracker exercise-detail pages.
 *
 * Two variants:
 * - `default` — glyph + label side-by-side.
 * - `compact` — glyph + label inline, smaller padding (good for chips).
 *
 * @param props - Component props (see {@link MuscleGroupBadgeProps}).
 * @returns The badge component.
 */
export const MuscleGroupBadge = defineComponent({
  name: 'MuscleGroupBadge',
  props: {
    group: { type: String as PropType<MuscleGroup>, required: true },
    label: { type: String, default: undefined },
    variant: {
      type: String as PropType<NonNullable<MuscleGroupBadgeProps['variant']>>,
      default: 'default',
    },
    size: {
      type: String as PropType<NonNullable<MuscleGroupBadgeProps['size']>>,
      default: 'md',
    },
    accentColor: { type: String, default: undefined },
    dataMolId: { type: String, default: undefined },
    className: { type: String, default: undefined },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const accent = props.accentColor ?? ACCENT[props.group]
      const px = SIZE_PX[props.size]
      const resolvedLabel = props.label ?? translatedLabel(t, props.group)

      const wrapperStyle = {
        padding: props.variant === 'compact' ? '0.2rem 0.5rem' : '0.4rem 0.7rem',
        borderRadius: '999px',
        // The accent ring carries the group's palette color (data), not a theme tone.
        border: `1px solid ${accent}`,
        display: 'inline-flex',
      }

      return h(
        'span',
        {
          class: cm.cn(
            cm.flex({ align: 'center', gap: props.variant === 'compact' ? 'xs' : 'sm' }),
            // The pill's recessed surface, from the theme.
            cm.surfaceSecondary,
            props.className,
          ),
          role: 'group',
          'aria-label': t(
            'muscleGroupBadge.group',
            { name: resolvedLabel },
            { defaultValue: '{{name}} muscle group' },
          ),
          'data-mol-id': props.dataMolId ?? 'muscle-group-badge',
          'data-group': props.group,
          style: wrapperStyle,
        },
        [
          MuscleGlyph(props.group, accent, px),
          h(
            'span',
            {
              class: cm.cn(
                cm.textSize(props.variant === 'compact' ? 'xs' : 'sm'),
                cm.fontWeight('semibold'),
              ),
              'data-mol-id': 'muscle-group-label',
            },
            [resolvedLabel],
          ),
        ],
      )
    }
  },
})
