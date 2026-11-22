<!--
  Renders `page` with `pageProps` (or RoutedView) under the binding's RouterProvider with the given
  router and, when given, the routing bond's routed view. Generic over the page's props, as
  ContextHost is, so each call is checked against the page it mounts.
-->
<script lang="ts" generics="PageProps extends Record<string, unknown>">
  import type { Component } from 'svelte'

  import type { Router } from '@molecule/app-routing'

  import { RouterProvider } from '../../providers/index.js'
  import { RoutedView } from '../../routed-view/index.js'

  let {
    router,
    routedView,
    page: Page,
    pageProps,
  }: {
    router: Router
    routedView?: Component
    page?: Component<PageProps>
    pageProps: PageProps
  } = $props()
</script>

<RouterProvider {router} {routedView}>
  {#if Page}
    <Page {...pageProps} />
  {:else}
    <RoutedView />
  {/if}
</RouterProvider>
