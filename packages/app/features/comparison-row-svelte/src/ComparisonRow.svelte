<!--
  ComparisonRow: the Svelte counterpart of `@molecule/app-comparison-row-react`'s
  `ComparisonRow` — period-over-period stat comparison row: current value,
  optional previous value, and a coloured delta% chip. Same props (React
  names), same DOM for the same input; the delta's tone class and the layout
  and type classes come from the ClassMap bond.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from './style.js'
  import type { ComparisonRowProps } from './types.js'

  let {
    label,
    current,
    previous,
    deltaPct,
    formatDelta,
    periodLabel,
    className,
  }: ComparisonRowProps = $props()

  const cm = $derived(getClassMap())
  const arrow = $derived(
    deltaPct === undefined ? '' : deltaPct > 0 ? '▲' : deltaPct < 0 ? '▼' : '–',
  )
  // The delta's tone class: the theme's success green for a rise, its error
  // red for a fall, its secondary grey for no change.
  const deltaToneClass = $derived(
    deltaPct === undefined
      ? ''
      : cm.textTone(deltaPct > 0 ? 'success' : deltaPct < 0 ? 'error' : 'secondary'),
  )
  const pct = $derived(deltaPct === undefined ? '' : Math.abs(deltaPct).toFixed(1))
</script>

<div class={cm.cn(cm.flex({ align: 'baseline', justify: 'between', gap: 'md' }), className)}>
  <div class={cm.stack(0)}>
    <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
      {#if typeof label === 'function'}{@render label()}{:else}{label}{/if}
    </span>
    {#if periodLabel}
      <span class={cm.textSize('xs')}>
        {#if typeof periodLabel === 'function'}{@render periodLabel()}{:else}{periodLabel}{/if}
      </span>
    {/if}
  </div>
  <div class={cm.flex({ align: 'baseline', gap: 'sm' })}>
    <span class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
      {#if typeof current === 'function'}{@render current()}{:else}{current}{/if}
    </span>
    {#if previous !== undefined}
      <span
        class={cm.cn(cm.textSize('xs'))}
        use:reactStyle={{ textDecoration: 'line-through', opacity: 0.6 }}
      >
        {#if typeof previous === 'function'}{@render previous()}{:else}{previous}{/if}
      </span>
    {/if}
    {#if deltaPct !== undefined}
      <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), deltaToneClass)}>
        {#if formatDelta}{@render formatDelta(deltaPct)}{:else}{arrow} {pct}%{/if}
      </span>
    {/if}
  </div>
</div>
