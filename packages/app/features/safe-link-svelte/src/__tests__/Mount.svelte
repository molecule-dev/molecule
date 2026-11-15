<!--
  Test mount wrapper for the SafeLink unit tests: provides the molecule
  context with a memory router seeded at `route`, then renders `SafeLink` with
  the text child compiled from a real template — so the anchor's content is
  bare text exactly as the React suite renders it.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { createMemoryRouter } from '@molecule/app-routing'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import SafeLink from '../SafeLink.svelte'

  let {
    route,
    to,
    className,
    text,
  }: { route: string; to: string; className?: string; text: string } = $props()

  // The router is fixed for the wrapper's lifetime (one mount per test), so
  // the initial route value is read untracked on purpose.
  setMoleculeContext({
    router: createMemoryRouter({ initialEntries: [untrack(() => route)] }),
  })
</script>

<SafeLink {to} {className}>{text}</SafeLink>
