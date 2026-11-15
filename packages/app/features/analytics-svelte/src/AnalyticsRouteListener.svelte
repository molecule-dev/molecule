<!--
  AnalyticsRouteListener: the Svelte counterpart of
  `@molecule/app-analytics-react`'s `AnalyticsRouteListener` — a `page` event
  with the current pathname / search on mount and on every client-side route
  change. It takes no props and renders nothing.
-->
<script lang="ts">
  import { page } from '@molecule/app-analytics'
  import { useLocation } from '@molecule/app-svelte'

  const location = useLocation()

  // React keys its effect on the pathname and search VALUES. The deriveds keep
  // that behavior: a navigation that replaces the location without changing
  // either value does not re-record.
  const name = $derived($location.pathname)
  const path = $derived(name + $location.search)

  $effect(() => {
    void page({
      name,
      path,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    })
  })
</script>
