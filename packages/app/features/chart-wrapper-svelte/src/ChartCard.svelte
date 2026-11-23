<!--
  ChartCard: the Svelte counterpart of `@molecule/app-chart-wrapper-react`'s
  `ChartCard` — uniform chrome (title / description / actions / summary / body /
  footer) around a chart rendering. Same props (React names), same ClassMap
  tokens, same DOM. Node props (`title`, `description`, `actions`, `summary`,
  `footer`) are snippets, or plain strings.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import type { ChartCardProps } from './types.js'

  let {
    title,
    description,
    actions,
    summary,
    children,
    footer,
    minChartHeight = 240,
    className,
    dataMolId,
  }: ChartCardProps = $props()

  const cm = $derived(getClassMap())
</script>

<Card {className} data-mol-id={dataMolId}>
  <div class={cm.stack(4)}>
    <header class={cm.flex({ justify: 'between', align: 'start', gap: 'sm' })}>
      <div class={cm.stack(1)}>
        <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
          {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
        </h3>
        {#if typeof description === 'function'}
          <p class={cm.textSize('sm')}>{@render description?.()}</p>
        {:else if description}
          <p class={cm.textSize('sm')}>{description}</p>
        {/if}
      </div>
      {#if actions}
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>
          {#if typeof actions === 'function'}{@render actions?.()}{:else}{actions}{/if}
        </div>
      {/if}
    </header>
    {#if summary}
      <div class={cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })}>
        {#if typeof summary === 'function'}{@render summary?.()}{:else}{summary}{/if}
      </div>
    {/if}
    <div style="min-height: {minChartHeight}px">
      {#if typeof children === 'function'}{@render children?.()}{:else}{children}{/if}
    </div>
    {#if footer}
      <div>
        {#if typeof footer === 'function'}{@render footer?.()}{:else}{footer}{/if}
      </div>
    {/if}
  </div>
</Card>
