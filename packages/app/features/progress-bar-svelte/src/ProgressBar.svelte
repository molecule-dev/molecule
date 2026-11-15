<!--
  ProgressBar: the Svelte counterpart of `@molecule/app-progress-bar-react`'s
  `ProgressBar` — same props, same ClassMap tokens, same DOM. Node props
  (`label`, `valueLabel`) are snippets, or plain strings.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { ProgressBarProps } from './types.js'

  let {
    value,
    max = 100,
    label,
    valueLabel,
    size = 'md',
    color = 'primary',
    className,
  }: ProgressBarProps = $props()

  const cm = $derived(getClassMap())
  const percent = $derived(max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100)))
</script>

<div class={cm.cn(cm.stack(2), className)}>
  {#if label || valueLabel}
    <div class={cm.flex({ justify: 'between', align: 'center' })}>
      {#if label}
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
          {#if typeof label === 'function'}{@render label()}{:else}{label}{/if}
        </span>
      {/if}
      {#if valueLabel}
        <span class={cm.textSize('sm')}>
          {#if typeof valueLabel === 'function'}{@render valueLabel()}{:else}{valueLabel}{/if}
        </span>
      {/if}
    </div>
  {/if}
  <div
    class={cm.cn(cm.progress(), cm.progressHeight(size))}
    role="progressbar"
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={max}
  >
    <div class={cm.cn(cm.progressBar(), cm.progressColor(color))} style="width: {percent}%"></div>
  </div>
</div>
