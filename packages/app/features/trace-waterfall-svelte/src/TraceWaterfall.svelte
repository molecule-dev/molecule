<!--
  TraceWaterfall: the Svelte counterpart of `@molecule/app-trace-waterfall-react`'s
  `TraceWaterfall` — the same props (React names), the same ClassMap tokens,
  inline styles and DOM for the same input. Each span renders as a horizontal
  bar positioned by `startTime`, scaled to the trace's total duration and
  indented by parent depth, under a time axis. `emptyState` is a snippet.
-->
<script lang="ts">
  import { useLocale, useT } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { LABEL_COLUMN_PX } from './constants.js'
  import { translateDuration } from './format.js'
  import { layoutSpans } from './layout.js'
  import TraceWaterfallAxis from './TraceWaterfallAxis.svelte'
  import TraceWaterfallRow from './TraceWaterfallRow.svelte'
  import type { TraceWaterfallProps } from './types.js'

  let {
    spans,
    rootSpanId,
    selectedSpanId,
    onSpanClick,
    emptyState,
    className,
  }: TraceWaterfallProps = $props()

  const cm = $derived(getClassMap())
  const t = useT()
  // Read through `$activeLocale` in the total label, so it follows a locale switch.
  const activeLocale = useLocale()
  const layout = $derived(layoutSpans(spans, rootSpanId))
</script>

{#if layout.rows.length === 0}
  {#if emptyState}
    {@render emptyState()}
  {:else}
    <div
      class={cm.cn(cm.sp('p', 3), cm.textSize('sm'), className)}
      data-mol-id="trace-waterfall-empty"
      role="status"
    >
      {t('traceWaterfall.empty', undefined, { defaultValue: 'No spans to display.' })}
    </div>
  {/if}
{:else}
  <div
    class={cm.cn(cm.stack(1), className)}
    role="region"
    aria-label={t('traceWaterfall.aria.label', undefined, {
      defaultValue: 'Distributed trace waterfall',
    })}
    data-mol-id="trace-waterfall"
  >
    <TraceWaterfallAxis
      traceDuration={layout.traceDuration}
      labelColumnWidth={LABEL_COLUMN_PX}
      totalLabel={t(
        'traceWaterfall.totalDuration',
        { duration: translateDuration(layout.traceDuration, $activeLocale, t) },
        { defaultValue: 'Total: {{duration}}' },
      )}
    />
    <div role="tree" data-mol-id="trace-waterfall-rows">
      {#each layout.rows as row (row.span.id)}
        <TraceWaterfallRow
          {row}
          labelColumnWidth={LABEL_COLUMN_PX}
          selected={selectedSpanId === row.span.id}
          {onSpanClick}
        />
      {/each}
    </div>
  </div>
{/if}
