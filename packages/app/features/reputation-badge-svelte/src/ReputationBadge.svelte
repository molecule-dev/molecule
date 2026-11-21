<!--
  ReputationBadge: the Svelte counterpart of
  `@molecule/app-reputation-badge-react`'s `ReputationBadge` — a numeric score
  plus a tier chip, in the compact (default) or full (captioned, stacked)
  variant. Same props, same ClassMap tokens, same i18n keys, same DOM for the
  same input: React's root flips between `<span>` (compact) and `<div>` (full),
  and so does this component's.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Badge } from '@molecule/app-ui-svelte'

  import { formatScore, levelLabel } from './labels.js'
  import { colorForLevel, DEFAULT_THRESHOLDS, levelForScore } from './levels.js'
  import type { ReputationBadgeProps } from './types.js'

  let { score, level, thresholds, variant = 'compact', className }: ReputationBadgeProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const resolvedLevel = $derived(level ?? levelForScore(score, thresholds ?? DEFAULT_THRESHOLDS))
  const color = $derived(colorForLevel(resolvedLevel))
  const label = $derived(levelLabel(t, resolvedLevel))
  const formattedScore = $derived(formatScore(score))
  const caption = $derived(t('reputationBadge.caption', {}, { defaultValue: 'Reputation' }))
  const ariaLabel = $derived(
    t(
      'reputationBadge.aria',
      { score: formattedScore, level: label },
      { defaultValue: '{{score}} reputation, {{level}}' },
    ),
  )
</script>

{#if variant === 'full'}
  <div class={cm.cn(cm.stack(1), className)} data-mol-id="reputation-badge" aria-label={ariaLabel}>
    <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>{caption}</span>
    <div class={cm.flex({ align: 'center', gap: 'sm' })} data-mol-id="reputation-badge-row">
      <span
        class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
        data-mol-id="reputation-badge-score">{formattedScore}</span
      >
      <Badge {color}>{label}</Badge>
    </div>
  </div>
{:else}
  <span
    class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
    data-mol-id="reputation-badge"
    aria-label={ariaLabel}
  >
    <span class={cm.fontWeight('semibold')} data-mol-id="reputation-badge-score"
      >{formattedScore}</span
    >
    <Badge {color}>{label}</Badge>
  </span>
{/if}
