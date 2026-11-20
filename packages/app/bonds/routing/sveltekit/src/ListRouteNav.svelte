<!--
  @component
  Navigation between URL-backed list views, using the same declaration for labels and
  destinations — react-router's `ListRouteNav` over this bond's router.

  It renders its own `<a>` elements (neither kit's links nor the Svelte binding's `Link`):
  each `href` is the router's `createHref` of the destination, and each click goes through
  `@molecule/app-routing`'s `followRouterLink`, the one click rule every binding's `Link`
  uses. The URL selects the active choice, and selecting any view resets pagination through
  `useListRoute`. This is a navigation landmark, not an ARIA tablist with local panels. It
  ships no styles: classes, if any, come from the app's class map.
-->
<script lang="ts" generics="Selection extends string">
  import { onDestroy } from 'svelte'
  import { writable } from 'svelte/store'

  import type {
    ListRouteOptions,
    ListRouteResult,
    ListRouteSelection,
    RouteParams,
  } from '@molecule/app-routing'
  import { followRouterLink, generatePath } from '@molecule/app-routing'

  import type {
    ListRouteNavItem,
    ListRouteNavItemState,
    ListRouteNavProps,
  } from './list-route-nav.js'
  import { useListRoute } from './useListRoute.js'
  import { useMoleculeRouter } from './useMoleculeRouter.js'

  let {
    'aria-label': ariaLabel,
    selections,
    defaultSelection,
    pageParam,
    auth,
    list,
    linkClassName,
    children,
    ...rest
  }: ListRouteNavProps<Selection> = $props()

  const router = useMoleculeRouter()

  /**
   * Bumped once per navigation the router commits. React re-renders after a navigation; a
   * Svelte component is initialised once, so its render reads this to re-read the URL.
   */
  let revision = $state(0)
  onDestroy(
    router.subscribe(() => {
      revision += 1
    }),
  )

  /**
   * The list options this component resolves with: the same declarations, with each choice's
   * own parameters substituted into its path before matching — React resolves them per
   * render for the same reason (two choices can share `/folders/:folder` while naming
   * different folders).
   *
   * @returns The options for the current declarations and route.
   */
  function buildOptions(): ListRouteOptions<string, Selection> {
    // The route's parameters change with a navigation, so this reads the revision too.
    void revision
    const routeParams: RouteParams = {}
    for (const [name, value] of Object.entries(router.getParams())) {
      if (value !== undefined) routeParams[name] = value
    }
    const destinations: Record<Selection, ListRouteSelection> = { ...selections }
    for (const [selection, item] of Object.entries(selections) as [Selection, ListRouteNavItem][]) {
      if (item.params) {
        destinations[selection] = {
          ...item,
          path: generatePath(item.path, { ...routeParams, ...item.params }),
        }
      }
    }
    return { selections: destinations, defaultSelection, pageParam, auth }
  }

  const options = writable(buildOptions())
  // React re-reads changed props on every render; here the list re-resolves when the
  // declaration or the route changes, so a later `selections` array is honoured too.
  $effect(() => {
    options.set(buildOptions())
  })

  const route = useListRoute<string, Selection>(options)
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
  } = route

  /** The list the children branch renders from: the same result React passes it. */
  const listRoute = $derived.by((): ListRouteResult<string, Selection> => ({
    page: $page,
    pageSize: $pageSize,
    offset: $offset,
    filters: $filters,
    selection: $selection,
    params: $params,
    canLoad: $canLoad,
    status: $status,
    redirectTo: $redirectTo,
    href,
    navigate,
    setPage,
    setFilters,
    select,
  }))

  /** One rendered choice: its destination, its URL-derived state and its styling. */
  interface LinkModel {
    /** The app-owned selection key. */
    selection: Selection
    /** The translated label, as text or as a snippet. */
    label: ListRouteNavItem['label']
    /** The in-app path a click navigates to. */
    path: string
    /** The href the anchor carries, with the router's base (or `#`). */
    href: string
    /** Whether the current URL selects this view. */
    active: boolean
    /** Whether navigation is disabled for this choice. */
    disabled: boolean
    /** `active` or `inactive`, for the app's CSS. */
    state: 'active' | 'inactive'
    /** The app's link class for this state. */
    className: string | undefined
  }

  const links = $derived.by((): LinkModel[] => {
    void revision
    return (Object.entries(selections) as [Selection, ListRouteNavItem][]).map(
      ([key, item]): LinkModel => {
        const active = $selection === key
        const disabled = item.disabled === true
        const state: ListRouteNavItemState<Selection> = { selection: key, active, disabled }
        const path = href({ selection: key })
        return {
          selection: key,
          label: item.label,
          path,
          href: router.createHref(path),
          active,
          disabled,
          state: active ? 'active' : 'inactive',
          className: typeof linkClassName === 'function' ? linkClassName(state) : linkClassName,
        }
      },
    )
  })

  /**
   * Navigates in-app for a click the router should take, leaving every other click (a new
   * tab, a download, another origin) to the browser.
   *
   * @param event - The anchor's click event.
   * @param path - The in-app path the link names.
   */
  function handleClick(
    event: MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement },
    path: string,
  ): void {
    followRouterLink(event, path, router)
  }
</script>

{#snippet choice(link: LinkModel)}
  {#if link.disabled}
    <span
      class={link.className}
      data-state={link.state}
      data-mol-id="list-route-{link.selection}"
      role="link"
      aria-disabled="true"
      aria-current={link.active ? 'page' : undefined}>{@render label(link.label)}</span
    >
  {:else}
    <a
      class={link.className}
      data-state={link.state}
      data-mol-id="list-route-{link.selection}"
      aria-current={link.active ? 'page' : undefined}
      href={link.href}
      onclick={(event) => handleClick(event, link.path)}>{@render label(link.label)}</a
    >
  {/if}
{/snippet}

{#snippet label(content: ListRouteNavItem['label'])}
  {#if typeof content === 'string'}{content}{:else}{@render content()}{/if}
{/snippet}

<nav {...rest} aria-label={ariaLabel}>
  {#if list}
    <ul class={list.className}>
      {#each links as link (link.selection)}<li class={list.itemClassName}>
          {@render choice(link)}
        </li>{/each}
    </ul>
  {:else}
    {#each links as link (link.selection)}{@render choice(link)}{/each}
  {/if}
</nav>
{#if children}{@render children(listRoute)}{/if}
