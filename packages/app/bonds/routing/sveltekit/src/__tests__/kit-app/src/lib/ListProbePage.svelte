<!--
  The Svelte form of React's `list-route.integration` page: the app's list page over the
  bond's `useListRoute` and `useConsumedSearchParam`, exactly the hooks
  `@molecule/app-svelte` returns. The page hands the case's options to the hook as a store
  (a case's `rerender()` republishes them, React's re-render), keeps the one-time
  credential with the hook, and publishes the handle the case reads its state and calls its
  actions through. The collection request replaces React's `useQuery`, keyed by the request
  as that query is.
-->
<script lang="ts">
  import { resolve } from '$app/paths'
  import { onDestroy } from 'svelte'
  import { get, writable } from 'svelte/store'

  import { I18nError } from '@molecule/app-i18n'
  import type { ListRouteOptions, ListRouteResult, RouteParams } from '@molecule/app-routing'

  import { useConsumedSearchParam, useListRoute, useMoleculeRouter } from '../../../../index.js'
  import {
    type ListProbeLink,
    type ListProbeRequest,
    listProbeScenario,
    publishListProbeHandle,
  } from './list-probe.js'

  const scenario = listProbeScenario()
  const router = useMoleculeRouter()

  // Bumped by the router's own notification for every commit, so the address this page
  // renders re-reads the location (the list fields below are stores and follow by
  // themselves).
  let revision = $state(0)
  let data = $state<unknown>(undefined)

  const stopRouter = router.subscribe(() => {
    revision += 1
  })
  onDestroy(stopRouter)

  // The options are a store so `rerender()` (React's re-render when the app's auth status
  // changes) publishes a fresh object and the hook re-resolves the list.
  const options = writable<ListRouteOptions<string, string>>(scenario.options)
  const {
    page,
    pageSize,
    offset,
    filters,
    selection,
    params,
    canLoad,
    status,
    redirectTo,
    href,
    navigate,
    setPage,
    setFilters,
    select,
  } = useListRoute<string, string>(options)

  // The one-time credential: the hook reads it now and consumes it after mount, as
  // React's hook does.
  const credential = scenario.token ? useConsumedSearchParam(scenario.token) : undefined

  /**
   * A view's link, or `undefined` when its declaration needs a path parameter this address
   * cannot supply — the case declares such a view through `extraLinks` with its values.
   *
   * @param view - The declared view.
   * @param viewParams - Path parameter values for the link.
   * @returns The in-app href, or `undefined` when the declaration cannot be built.
   */
  function hrefOf(view: string, viewParams?: RouteParams): string | undefined {
    try {
      return resolve(href({ selection: view, params: viewParams }))
    } catch (error) {
      if (error instanceof I18nError) return undefined
      throw error
    }
  }

  const declared: ListProbeLink[] = Object.keys(scenario.options.selections ?? {}).map((view) => ({
    id: view,
    selection: view,
  }))
  // Rebuilt on every commit: `href` reads the hook's latest resolution, and `revision`
  // makes this derivation run again after the hook's own notification updated it.
  const links = $derived.by(() => {
    void revision
    return [...declared, ...(scenario.extraLinks ?? [])].map((link) => ({
      ...link,
      href: hrefOf(link.selection, link.params),
    }))
  })

  /** The next page's link, rebuilt on every commit for the same reason as {@link links}. */
  const nextHref = $derived.by(() => {
    void revision
    return resolve(href({ page: $page + 1 }))
  })

  // One fetch per committed request, and React's `useQuery` key is the request itself:
  // a re-render that leaves the request unchanged reads what it already has.
  let requested = ''
  $effect(() => {
    const request: ListProbeRequest = {
      selection: $selection,
      filters: $filters,
      params: $params,
      limit: $pageSize,
      offset: $offset,
    }
    if (!$canLoad || !scenario.read) return
    const key = JSON.stringify(request)
    if (key === requested) return
    requested = key
    void scenario.read(request).then((result) => {
      data = result
    })
  })

  /**
   * The address the router reads, re-read on every commit (the list fields follow by
   * themselves).
   *
   * @returns The in-app pathname, query string and hash.
   */
  const currentUrl = $derived.by(() => {
    void revision
    const location = router.getLocation()
    return location.pathname + location.search + location.hash
  })

  /**
   * The list state of the page's current render, as React's `current` holds it.
   *
   * @returns The resolved list for the current location and options.
   */
  const list = (): ListRouteResult<string, string> => ({
    page: get(page),
    pageSize: get(pageSize),
    offset: get(offset),
    filters: get(filters),
    selection: get(selection),
    params: get(params),
    canLoad: get(canLoad),
    status: get(status),
    redirectTo: get(redirectTo),
    href,
    navigate,
    setPage,
    setFilters,
    select,
  })

  publishListProbeHandle({
    list,
    url: () => {
      const location = router.getLocation()
      return location.pathname + location.search + location.hash
    },
    state: () => router.getLocation().state,
    data: () => data,
    token: () => (credential ? get(credential)[0] : ''),
    rerender: () => {
      options.set({ ...scenario.options })
    },
  })
</script>

<output data-testid="page">{$page}</output>
<a id="next" href={nextHref}>Next</a>
<button
  id="previous"
  type="button"
  onclick={() => {
    setPage(Math.max(1, $page - 1))
  }}>Previous</button
>
{#each links as link (link.id)}
  {#if link.href}
    <a id={link.id} href={link.href}>{link.selection}</a>
  {/if}
{/each}
<output data-testid="url">{currentUrl}</output>
