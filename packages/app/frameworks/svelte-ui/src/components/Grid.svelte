<!-- Grid: a grid container with token columns/gap and raw template/track values. -->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { type CSSStyle, reactStyle } from '../style.js'
  import type { GridProps } from '../types.js'

  let {
    ref = $bindable(null),
    children,
    columns,
    rows,
    gap,
    columnGap,
    rowGap,
    className,
    style,
    testId,
    ...rest
  }: GridProps = $props()

  const cm = $derived(getClassMap())
  const cmCols = $derived(typeof columns === 'number' ? columns : undefined)
  const tokenGaps = ['none', 'xs', 'sm', 'md', 'lg', 'xl']
  const cmGap = $derived(
    typeof gap === 'string' && tokenGaps.includes(gap)
      ? (gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl')
      : undefined,
  )
  const gridClasses = $derived(cm.cn(cm.grid({ cols: cmCols, gap: cmGap }), className))
  // Only the values this Grid sets, as React's Grid does: `reactStyle` writes an undefined key as
  // '' the way React does, which removed the gaps `gap` had just set and erased the same property
  // from the caller's `style`.
  const gridStyle = $derived.by(() => {
    const own: Record<string, string | number> = {}
    if (typeof columns === 'string') own.gridTemplateColumns = columns
    if (typeof rows === 'string') own.gridTemplateRows = rows
    if (typeof gap === 'number' || (typeof gap === 'string' && !tokenGaps.includes(gap)))
      own.gap = gap
    if (typeof columnGap === 'number' || typeof columnGap === 'string') own.columnGap = columnGap
    if (typeof rowGap === 'number' || typeof rowGap === 'string') own.rowGap = rowGap
    return { ...style, ...own } as CSSStyle
  })
</script>

<div
  bind:this={ref}
  class={gridClasses}
  use:reactStyle={gridStyle}
  data-testid={testId}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {@render children?.()}
</div>
