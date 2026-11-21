<!--
  LimitsItem: the Svelte counterpart of `@molecule/app-billing-react`'s
  `LimitsItem` — one row of a tier's feature list, a check (or dash) glyph
  followed by the row label. Same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Icon } from '@molecule/app-ui-svelte'

  import type { LimitsItemProps } from './types.js'

  let { children, included = true }: LimitsItemProps = $props()

  const cm = $derived(getClassMap())
</script>

<li
  class={cm.cn(
    cm.flex({ direction: 'row', align: 'start', gap: 'sm' }),
    cm.textSize('sm'),
    !included && cm.textMuted,
  )}
>
  <Icon
    name={included ? 'check-circle' : 'minus'}
    size={18}
    aria-hidden="true"
    className={included ? cm.textPrimary : cm.textSubtle}
  />
  <span>{@render children?.()}</span>
</li>
