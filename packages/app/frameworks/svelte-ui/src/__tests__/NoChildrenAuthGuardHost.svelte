<!--
  Test host for the AuthGuard's no-children case: wires the real molecule Svelte
  context (auth client, router, i18n) and renders the guard with no children, so
  it falls back to `RoutedView`. With no routed view in the context that throws.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { MoleculeConfig } from '@molecule/app-svelte'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import AuthGuard from '../components/AuthGuard.svelte'

  let {
    auth,
    router,
    i18n,
  }: {
    auth: NonNullable<MoleculeConfig['auth']>
    router: NonNullable<MoleculeConfig['router']>
    i18n: NonNullable<MoleculeConfig['i18n']>
  } = $props()

  // The harness's services are fixed for the host's whole life (a context is
  // read once during init), so the initial props are the ones to wire.
  untrack(() => setMoleculeContext({ auth, router, i18n }))
</script>

<AuthGuard />
