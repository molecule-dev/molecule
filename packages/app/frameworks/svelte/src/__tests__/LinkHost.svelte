<!--
  Test host for the `Link` conformance cases: provides the router through
  `setMoleculeContext`, then renders `Link` with its own props type. `LinkProps`
  is an interface, so it does not carry the implicit index signature the generic
  `ContextHost` requires of a props type.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { setMoleculeContext } from '../context.js'
  import Link from '../link/Link.svelte'
  import type { LinkProps } from '../link/types.js'
  import type { MoleculeConfig } from '../types.js'

  let {
    config,
    link,
    onanchor,
  }: {
    config: MoleculeConfig
    link: LinkProps
    onanchor?: (anchor: HTMLAnchorElement | null) => void
  } = $props()

  let anchor = $state<HTMLAnchorElement | null>(null)
  $effect(() => onanchor?.(anchor))

  // The case's services are fixed for the host's whole run.
  untrack(() => setMoleculeContext(config))
</script>

<Link {...link} bind:ref={anchor} />
