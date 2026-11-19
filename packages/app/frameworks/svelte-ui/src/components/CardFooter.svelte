<!-- Card footer row. -->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { CardFooterProps } from '../types.js'

  let { ref = $bindable(null), children, className, style, ...rest }: CardFooterProps = $props()
  const cm = $derived(getClassMap())
</script>

<div
  bind:this={ref}
  class={cm.cn(cm.cardFooter, className)}
  use:reactStyle={style}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {@render children?.()}
</div>
