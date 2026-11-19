<!--
  The Svelte form of React's `list-route.integration` page: the app's list page over the
  bond's router, resolving the shared `resolveListRoute` rules on every committed
  navigation (and on the app's own re-render, an auth status change), exactly as
  `@molecule/app-svelte`'s `useListRoute` does. The case declares the page from `window`
  (`list-probe.ts`) and reads it back through the handle the page publishes; the
  collection request replaces React's `useQuery`, keyed by the request as that query is.
-->
<script lang="ts">
  import { resolve } from '$app/paths'
  import { onDestroy, onMount } from 'svelte'

  import { I18nError } from '@molecule/app-i18n'
  import {
    createConsumedSearchParam,
    listRouteRedirect,
    type ListRouteResult,
    resolveListRoute,
    type RouteParams,
  } from '@molecule/app-routing'

  import {
    type ListProbeLink,
    type ListProbeRequest,
    listProbeScenario,
    publishListProbeHandle,
  } from './list-probe.js'
  import { appRouter } from './probe.js'

  const scenario = listProbeScenario()
  const router = appRouter()

  // Bumped by the router's own notification for every commit, and by the case's
  // `rerender()` (React's re-render when the app's auth status changes).
  let revision = $state(0)
  let rerenders = $state(0)
  let data = $state<unknown>(undefined)

  // The one-time credential, read at once as React's hook reads it at render, then
  // connected after mount so it is taken out of the address with a replace navigation.
  const credential = scenario.token ? createConsumedSearchParam(router, scenario.token) : undefined
  let token = $state(credential?.get() ?? '')

  const stopRouter = router.subscribe(() => {
    revision += 1
  })
  onDestroy(stopRouter)

  const list = $derived.by((): ListRouteResult<string, string> => {
    void revision
    void rerenders
    return resolveListRoute<string, string>(
      { location: router.getLocation(), routeParams: router.getParams() },
      scenario.options,
      (path, options) => router.navigate(path, options),
    )
  })

  const links = $derived.by(() => {
    const declared: ListProbeLink[] = Object.keys(scenario.options.selections ?? {}).map(
      (selection) => ({ id: selection, selection }),
    )
    return [...declared, ...(scenario.extraLinks ?? [])].map((link) => ({
      ...link,
      href: hrefOf(link.selection, link.params),
    }))
  })

  /**
   * A view's link, or `undefined` when its declaration needs a path parameter this address
   * cannot supply — the case declares such a view through `extraLinks` with its values.
   *
   * @param selection - The declared view.
   * @param params - Path parameter values for the link.
   * @returns The in-app href, or `undefined` when the declaration cannot be built.
   */
  function hrefOf(selection: string, params?: RouteParams): string | undefined {
    try {
      return resolve(list.href({ selection, params }))
    } catch (error) {
      if (error instanceof I18nError) return undefined
      throw error
    }
  }

  // One fetch per committed request, and React's `useQuery` key is the request itself:
  // a re-render that leaves the request unchanged reads what it already has.
  let requested = ''
  $effect(() => {
    const current = list
    const redirect = listRouteRedirect(current, router.getLocation())
    if (redirect) {
      void router.navigate(redirect.to, redirect.options)
      return
    }
    if (!current.canLoad || !scenario.read) return
    const request: ListProbeRequest = {
      selection: current.selection,
      filters: current.filters,
      params: current.params,
      limit: current.pageSize,
      offset: current.offset,
    }
    const key = JSON.stringify(request)
    if (key === requested) return
    requested = key
    void scenario.read(request).then((result) => {
      data = result
    })
  })

  onMount(() => {
    if (!credential) return
    const stopValue = credential.subscribe((value) => {
      token = value
    })
    // Consume after mount, as React's effect does, so the address is read before it moves.
    const stopConnect = credential.connect()
    return () => {
      stopValue()
      stopConnect()
    }
  })

  publishListProbeHandle({
    list: () => list,
    url: () => {
      const location = router.getLocation()
      return location.pathname + location.search + location.hash
    },
    state: () => router.getLocation().state,
    data: () => data,
    token: () => token,
    rerender: () => {
      rerenders += 1
    },
  })
</script>

<output data-testid="page">{list.page}</output>
<a id="next" href={resolve(list.href({ page: list.page + 1 }))}>Next</a>
<button
  id="previous"
  type="button"
  onclick={() => {
    list.setPage(Math.max(1, list.page - 1))
  }}>Previous</button
>
{#each links as link (link.id)}
  {#if link.href}
    <a id={link.id} href={link.href}>{link.selection}</a>
  {/if}
{/each}
<output data-testid="url"
  >{router.getLocation().pathname + router.getLocation().search + router.getLocation().hash}</output
>
