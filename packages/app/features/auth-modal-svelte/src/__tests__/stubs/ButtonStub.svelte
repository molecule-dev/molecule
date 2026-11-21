<!--
  Test stub for the Button UI component: the same `<button type disabled>` the
  React unit tests install for `@molecule/app-ui-react`, with `data-*` rest
  attrs passed through (the captcha suite reads `data-mol-id` off it).
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    type?: 'button' | 'reset' | 'submit'
    disabled?: boolean
    children?: Snippet
    [key: string]: unknown
  }

  let { type = 'button', disabled = false, children, ...rest }: Props = $props()
</script>

<button {type} {disabled} {...rest}>{@render children?.()}</button>
