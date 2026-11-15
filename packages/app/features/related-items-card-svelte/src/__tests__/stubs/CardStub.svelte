<!--
  Test stub for the Card UI component: the same `<div data-card
  data-mol-id>` wrapper forwarding `className` that the React unit tests
  install for `@molecule/app-ui-react`.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    className,
    children,
    ...rest
  }: { className?: string; children?: Snippet; [key: string]: unknown } = $props()

  const passthrough = $derived.by(() => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rest)) {
      if (k.startsWith('data-') || k.startsWith('aria-')) out[k] = v
    }
    return out
  })
</script>

<div data-card="" class={className} {...passthrough}>
  {@render children?.()}
</div>
