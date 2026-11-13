<!-- Card description paragraph. -->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { CardDescriptionProps } from '../types.js'

  let { children, className, style, ...rest }: CardDescriptionProps = $props()
  const cm = $derived(getClassMap())
</script>

<p
  class={cm.cn(cm.cardDescription, className)}
  use:reactStyle={style}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {@render children?.()}
</p>
