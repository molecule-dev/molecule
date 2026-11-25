<!--
  MuscleGroupBadge: the Svelte counterpart of
  `@molecule/app-muscle-group-badge-react`'s `MuscleGroupBadge` — a small
  body-silhouette glyph with the targeted muscle highlighted, plus a translated
  label. Same props (React names), same DOM for the same input; the pill's
  inline styles are applied through the CSSOM exactly as react-dom leaves them,
  and the layout and type classes come from the ClassMap bond.
-->
<script lang="ts">
  import type { TranslateFunction } from '@molecule/app-i18n'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { reactStyle } from '@molecule/app-ui-svelte'

  import type { MuscleGroup, MuscleGroupBadgeProps } from './types.js'

  let {
    group,
    label,
    variant = 'default',
    size = 'md',
    accentColor,
    dataMolId,
    className,
  }: MuscleGroupBadgeProps = $props()

  /**
   * Hex accent color per group — the group's own category palette (data), not
   * a theme tone; overridable via `accentColor`.
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
  const SIZE_PX = { sm: 32, md: 48, lg: 72 } as const

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

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const accent = $derived(accentColor ?? ACCENT[group])
  const px = $derived(SIZE_PX[size])
  const resolvedLabel = $derived(label ?? translatedLabel(t, group))
  const ariaLabel = $derived(
    t('muscleGroupBadge.group', { name: resolvedLabel }, { defaultValue: '{{name}} muscle group' }),
  )
  const wrapperClass = $derived(
    cm.cn(
      cm.flex({ align: 'center', gap: variant === 'compact' ? 'xs' : 'sm' }),
      // The pill's recessed surface, from the theme.
      cm.surfaceSecondary,
      className,
    ),
  )
  const labelClass = $derived(
    cm.cn(cm.textSize(variant === 'compact' ? 'xs' : 'sm'), cm.fontWeight('semibold')),
  )
  const wrapperStyle = $derived({
    padding: variant === 'compact' ? '0.2rem 0.5rem' : '0.4rem 0.7rem',
    borderRadius: '999px',
    // The accent ring carries the group's palette color (data), not a theme tone.
    border: `1px solid ${accent}`,
    display: 'inline-flex',
  })
</script>

<span
  class={wrapperClass}
  role="group"
  aria-label={ariaLabel}
  data-mol-id={dataMolId ?? 'muscle-group-badge'}
  data-group={group}
  use:reactStyle={wrapperStyle}
>
  <svg width={px} height={px} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <!-- Body silhouette — head + torso + limbs. -->
    <g fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.4">
      <circle cx="12" cy="3.5" r="2" />
      <path
        d="M7 6 h10 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 h-2 v5 h-2 v-5 h-2 v5 h-2 v-5 h-2 a1 1 0 0 1 -1 -1 v-9 a1 1 0 0 1 1 -1 z"
      />
    </g>
    {#if group === 'chest'}
      <rect x="9" y="6.5" width="6" height="3" rx="1" fill={accent} />
    {:else if group === 'back'}
      <rect x="9" y="7" width="6" height="4" rx="1" fill={accent} />
    {:else if group === 'shoulders'}
      <g fill={accent}>
        <circle cx="8.5" cy="6.5" r="1.4" />
        <circle cx="15.5" cy="6.5" r="1.4" />
      </g>
    {:else if group === 'biceps'}
      <g fill={accent}>
        <rect x="6" y="7.5" width="2" height="3.5" rx="1" />
        <rect x="16" y="7.5" width="2" height="3.5" rx="1" />
      </g>
    {:else if group === 'triceps'}
      <g fill={accent}>
        <rect x="5.5" y="9" width="2" height="3" rx="1" />
        <rect x="16.5" y="9" width="2" height="3" rx="1" />
      </g>
    {:else if group === 'forearms'}
      <g fill={accent}>
        <rect x="5" y="11" width="1.8" height="3" rx="0.6" />
        <rect x="17.2" y="11" width="1.8" height="3" rx="0.6" />
      </g>
    {:else if group === 'core'}
      <rect x="10" y="10.5" width="4" height="4" rx="0.8" fill={accent} />
    {:else if group === 'glutes'}
      <rect x="9" y="14" width="6" height="2.5" rx="1" fill={accent} />
    {:else if group === 'quads'}
      <g fill={accent}>
        <rect x="9" y="16" width="2.5" height="4" rx="0.8" />
        <rect x="12.5" y="16" width="2.5" height="4" rx="0.8" />
      </g>
    {:else if group === 'hamstrings'}
      <g fill={accent}>
        <rect x="9" y="17" width="2.5" height="3" rx="0.8" opacity="0.85" />
        <rect x="12.5" y="17" width="2.5" height="3" rx="0.8" opacity="0.85" />
      </g>
    {:else if group === 'calves'}
      <g fill={accent}>
        <rect x="9.5" y="20" width="2" height="2.5" rx="0.6" />
        <rect x="12.5" y="20" width="2" height="2.5" rx="0.6" />
      </g>
    {:else if group === 'fullBody'}
      <rect x="6" y="3" width="12" height="19" rx="2" fill={accent} fill-opacity="0.2" />
    {/if}
  </svg>
  <span class={labelClass} data-mol-id="muscle-group-label">{resolvedLabel}</span>
</span>
