<!-- Label: a form label with optional required marker. -->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import type { LabelProps } from '../types.js'
  let { children, required, className, ...rest }: LabelProps = $props()

  const cm = $derived(getClassMap())
</script>

<label
  class={cm.cn(cm.label({ required: !!required }), className)}
  {...reactAttrs(withoutEvents(rest))}
  use:spreadEvents={rest}>{@render children?.()}</label
>
