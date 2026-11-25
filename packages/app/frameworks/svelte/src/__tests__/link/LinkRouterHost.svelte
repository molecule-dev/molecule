<!--
  Renders `page` with `pageProps` with `router` in context through `setMoleculeContext`, as an
  app's root layout sets it, or with no router in context for `null`. Generic over the page's
  props, as ContextHost is, so each call is checked against the page it mounts.
-->
<script lang="ts" generics="PageProps extends Record<string, unknown>">
  import type { Component } from 'svelte'
  import { untrack } from 'svelte'

  import type { Router } from '@molecule/app-routing'

  import { setMoleculeContext } from '../../context.js'

  let {
    router,
    page: Page,
    pageProps,
  }: {
    router: Router | null
    page: Component<PageProps>
    pageProps: PageProps
  } = $props()

  // The case's services are fixed for the host's whole run.
  untrack(() => {
    if (router) setMoleculeContext({ router })
  })
</script>

<Page {...pageProps} />
