<!--
  Progress: an accessible progressbar with label row and clamped values.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from '../style.js'
  import type { ProgressProps } from '../types.js'

  let {
    value,
    max = 100,
    size = 'md',
    color = 'primary',
    showValue,
    label,
    indeterminate,
    className,
    style,
    testId,
  }: ProgressProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const percentage = $derived(Math.min(Math.max((value / max) * 100, 0), 100))
</script>

<div class={cm.cn(cm.progressWrapper, className)} use:reactStyle={style} data-testid={testId}>
  {#if label || showValue}
    <div class={cm.progressLabelContainer}>
      {#if label}<span class={cm.progressLabelText}>{label}</span>{/if}
      {#if showValue}
        <!-- Two blocks, two text nodes: React renders {Math.round(pct)} and '%'
             as separate children, and the parity snapshot sees text-node
             boundaries. Svelte merges adjacent expressions into one text node. -->
        <span class={cm.progressLabelText}
          >{#if true}{Math.round(percentage)}{/if}{#if true}%{/if}</span
        >
      {/if}
    </div>
  {/if}
  <div
    class={cm.cn(cm.progress(), cm.progressHeight(size))}
    role="progressbar"
    aria-valuenow={indeterminate ? undefined : Math.min(Math.max(value, 0), max)}
    aria-valuemin="0"
    aria-valuemax={max}
    aria-label={label ?? t('ui.progress.label', undefined, { defaultValue: 'Progress' })}
  >
    <div
      class={cm.cn(
        cm.progressBar(),
        cm.progressColor(color),
        indeterminate && cm.progressIndeterminate,
      )}
      use:reactStyle={indeterminate
        ? undefined
        : { transform: `translateX(-${100 - percentage}%)` }}
    ></div>
  </div>
</div>
