<!-- Grid: a grid container with token columns/gap and raw template/track values. -->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { type CSSStyle, reactStyle } from '../style.js'
  import type { GridProps } from '../types.js'

  let {
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
  const gridStyle = $derived({
    ...style,
    gridTemplateColumns: typeof columns === 'string' ? columns : undefined,
    gridTemplateRows: typeof rows === 'string' ? rows : undefined,
    gap:
      typeof gap === 'number' || (typeof gap === 'string' && !tokenGaps.includes(gap))
        ? gap
        : undefined,
    columnGap:
      typeof columnGap === 'number' || typeof columnGap === 'string' ? columnGap : undefined,
    rowGap: typeof rowGap === 'number' || typeof rowGap === 'string' ? rowGap : undefined,
  } as CSSStyle)
</script>

<div
  class={gridClasses}
  use:reactStyle={gridStyle}
  data-testid={testId}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {@render children?.()}
</div>
