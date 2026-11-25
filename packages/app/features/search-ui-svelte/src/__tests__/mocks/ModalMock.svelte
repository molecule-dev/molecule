<!--
  The Modal mock the unit tests substitute for `@molecule/app-ui-svelte`'s
  `Modal`: the same element the React tests' mock renders — a dialog role
  holding its children while open, nothing while closed. It forwards
  `aria-label` onto the dialog, as the real Modal moves `aria-*` there.
-->
<script lang="ts">
  import { type Snippet, untrack } from 'svelte'

  import type { OverlayTarget } from '@molecule/app-ui'

  let {
    open,
    'aria-label': ariaLabel,
    children,
    initialFocus,
  }: {
    open: boolean
    'aria-label'?: string
    children?: Snippet
    initialFocus?: OverlayTarget
  } = $props()

  $effect(() => {
    if (open) untrack(() => initialFocus?.current?.focus())
  })
</script>

{#if open}
  <div role="dialog" aria-label={ariaLabel} data-initial-focus={initialFocus ? 'true' : undefined}>
    {@render children?.()}
  </div>
{/if}
