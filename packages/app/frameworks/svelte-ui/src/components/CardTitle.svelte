<!-- Card title heading. -->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { CardTitleProps } from '../types.js'

  let { children, className, style, ...rest }: CardTitleProps = $props()
  const cm = $derived(getClassMap())
</script>

<h3
  class={cm.cn(cm.cardTitle, className)}
  use:reactStyle={style}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}
>
  {@render children?.()}
</h3>
