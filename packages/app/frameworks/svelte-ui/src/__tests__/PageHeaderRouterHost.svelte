<!--
  Test host for the PageHeader breadcrumb suite: installs the molecule context with a router (a
  breadcrumb with an href is a router link, which an app always mounts inside its router), then
  renders the header with its props, as a route tree does.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { MoleculeConfig } from '@molecule/app-svelte'
  import { setMoleculeContext } from '@molecule/app-svelte'

  import PageHeader from '../components/PageHeader.svelte'
  import type { PageHeaderProps } from '../types.js'

  let {
    router,
    title,
    breadcrumbs,
  }: {
    router: NonNullable<MoleculeConfig['router']>
    title: PageHeaderProps['title']
    breadcrumbs: PageHeaderProps['breadcrumbs']
  } = $props()

  // The router is fixed for the host's whole life (a context is read once during init).
  untrack(() => setMoleculeContext({ router }))
</script>

<PageHeader {title} {breadcrumbs} />
