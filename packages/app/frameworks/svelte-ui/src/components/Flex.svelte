<!-- Flex: a flex container with direction/align/justify/wrap and token or raw gap. -->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { FlexProps } from '../types.js'

  let {
    children,
    direction = 'row',
    justify,
    align,
    wrap,
    gap,
    className,
    style,
    testId,
    onClick,
    ...rest
  }: FlexProps = $props()

  const cm = $derived(getClassMap())
  const dirMap: Record<string, 'row' | 'col' | 'row-reverse' | 'col-reverse'> = {
    row: 'row',
    column: 'col',
    'row-reverse': 'row-reverse',
    'column-reverse': 'col-reverse',
  }
  const cmDirection = $derived(dirMap[direction] || 'row')
  const tokenGaps = ['none', 'xs', 'sm', 'md', 'lg', 'xl']
  const cmGap = $derived(
    typeof gap === 'string' && tokenGaps.includes(gap)
      ? (gap as 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl')
      : undefined,
  )
  const flexClasses = $derived(
    cm.cn(
      cm.flex({
        direction: cmDirection,
        align: align as never,
        justify: justify as never,
        wrap: wrap as never,
        gap: cmGap,
      }),
      className,
    ),
  )
  const gapStyle = $derived(
    typeof gap === 'number' || (typeof gap === 'string' && !tokenGaps.includes(gap))
      ? { gap }
      : undefined,
  )
</script>

<div
  class={flexClasses}
  use:reactStyle={{ ...style, ...gapStyle }}
  data-testid={testId}
  onclick={onClick}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {@render children?.()}
</div>
