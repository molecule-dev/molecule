<!--
  AuthShellCardColumn: the Svelte counterpart of
  `@molecule/app-auth-shell-react`'s `AuthShellCardColumn` — a centered
  `<section>` (or `<main>`, via `as`) that holds the form card.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { AuthShellCardColumnProps } from './types.js'

  let { children, className, as = 'section', ...rest }: AuthShellCardColumnProps = $props()

  const cm = $derived(getClassMap())
</script>

<svelte:element
  this={as}
  class={cm.cn(
    cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
    cm.minW(0),
    className,
  )}
  {...rest}
>
  {@render children?.()}
</svelte:element>
