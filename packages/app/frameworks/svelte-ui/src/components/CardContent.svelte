<!-- Card content block. -->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { CardContentProps } from '../types.js'

  let { children, className, style, ...rest }: CardContentProps = $props()
  const cm = $derived(getClassMap())
</script>

<div
  class={cm.cn(cm.cardContent, className)}
  use:reactStyle={style}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {@render children?.()}
</div>
