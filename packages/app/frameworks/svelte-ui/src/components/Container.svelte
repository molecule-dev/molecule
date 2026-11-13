<!-- Container: a max-width centered content wrapper. -->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { ContainerProps } from '../types.js'

  let {
    children,
    maxWidth = 'lg',
    centered = true,
    paddingX: _paddingX,
    className,
    style,
    testId,
    ...rest
  }: ContainerProps = $props()

  const cm = $derived(getClassMap())
  const containerClasses = $derived(
    cm.cn(
      cm.container({ size: maxWidth as 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' }),
      centered && cm.mxAuto,
      className,
    ),
  )
</script>

<div
  class={containerClasses}
  use:reactStyle={style}
  data-testid={testId}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {@render children?.()}
</div>
