<!--
  The `ListRouteNav` conformance probe: this route renders the bond's `ListRouteNav` and
  nothing else, so the recorded DOM is the component's own.

  kit serves a page from a file, so one catch-all route (`/probe/nav/[...rest]`) hosts every
  case path — kit keeps the page mounted while the route id stays the same, as React's mount
  keeps its elements. The router it hands the component reads the case's own path (the
  `/probe/nav` mount prefix stripped) and navigates back through it, so the destinations,
  links and history the component produces are the case's, not the harness's.
-->
<script lang="ts">
  import { afterNavigate, goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { page } from '$app/state'

  import type { ListRouteResult } from '@molecule/app-routing'

  import {
    createSvelteKitNavigation,
    ListRouteNav,
    MoleculeRouterProvider,
  } from '../../../../index.js'
  import type { KitGotoOptions, KitPage, SvelteKitNavigation } from '../../../../types.js'
  import { navCase } from './nav-case.js'

  /** The mount path this probe app serves the cases under. */
  const NAV_PREFIX = '/probe/nav'

  const scenario = navCase()

  /** kit's `goto`, re-prefixed with the mount path: the router it drives knows only in-app paths. */
  const navGoto = (url: string, options?: KitGotoOptions): Promise<void> =>
    goto(NAV_PREFIX + url, options)

  /** kit's page as the app under the mount path sees it: the case's path, its query and hash. */
  const navPage: KitPage = {
    get url() {
      const url = page.url
      const prefix = url.pathname.startsWith(NAV_PREFIX) ? NAV_PREFIX : ''
      return {
        pathname: url.pathname.slice(prefix.length) || '/',
        search: url.search,
        hash: url.hash,
      }
    },
    // The map path's own params (`rest`) are the harness's, not the case's: React's mount
    // declares the case's routes, and the router matches those patterns itself.
    params: {},
    get state() {
      return page.state
    },
  }

  const navigation: SvelteKitNavigation = createSvelteKitNavigation({
    goto: navGoto,
    page: navPage,
    afterNavigate,
    rootHref: resolve('/'),
  })

  /** The case's children text for the route the nav resolved. */
  function childrenText(route: ListRouteResult<string, string>): string {
    return scenario.children?.({ selection: route.selection, page: route.page }) ?? ''
  }
</script>

{#snippet listContent(route: ListRouteResult<string, string>)}
  <output data-testid="children">{childrenText(route)}</output>
{/snippet}

<MoleculeRouterProvider {navigation}>
  <ListRouteNav
    aria-label={scenario['aria-label']}
    selections={scenario.selections}
    defaultSelection={scenario.defaultSelection}
    pageParam={scenario.pageParam}
    list={scenario.list}
    linkClassName={scenario.linkClassName}
    children={scenario.children ? listContent : undefined}
    {...scenario.attrs}
  />
</MoleculeRouterProvider>
