<!-- Card footer row. -->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { CardFooterProps } from '../types.js'

  let { children, className, style, ...rest }: CardFooterProps = $props()
  const cm = $derived(getClassMap())
</script>

<div
  class={cm.cn(cm.cardFooter, className)}
  use:reactStyle={style}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {@render children?.()}
</div>
