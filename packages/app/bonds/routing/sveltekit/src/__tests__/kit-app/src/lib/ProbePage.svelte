<!--
  The probe page for the React bond's `list-route-nav` cases: it renders the bond's real
  `ListRouteNav` over kit's client router, with the case's declarations, and the page's own
  instrumentation (the address, the list's page, the collection request and a local panel)
  beside it. The declarations are resolved the way the component resolves them — each
  choice's own parameters substituted into its path — so the page's instrumentation reads
  the same list the navigation does.
-->
<script lang="ts">
  import { onDestroy } from 'svelte'

  import { generatePath } from '@molecule/app-routing'

  import { useListRoute, useMoleculeRouter } from '../../../../index.js'
  import { ListRouteNav } from '../../../../list-route-nav.js'
  import { probeScenario, type ProbeSelection } from './probe.js'

  const scenario = probeScenario()
  const router = useMoleculeRouter()

  // The router notifies once per committed navigation; each notification re-reads the
  // location this page renders.
  let revision = $state(0)
  onDestroy(
    router.subscribe(() => {
      revision += 1
    }),
  )

  let panel = $state(scenario.initialPanel ?? 'preview')

  // Resolve per-choice params before matching as well as before building links: two
  // choices can share /folders/:folder while naming different folders. The declarations
  // are static for the app's life, so this runs once.
  const selections: Record<string, ProbeSelection> = { ...scenario.selections }
  const routeParams = { ...router.getParams() }
  for (const [view, item] of Object.entries(scenario.selections)) {
    if (item.params) {
      selections[view] = {
        ...item,
        path: generatePath(item.path, { ...routeParams, ...item.params }),
      }
    }
  }

  const { selection, page } = useListRoute({
    selections,
    defaultSelection: scenario.defaultSelection,
    pageParam: scenario.pageParam,
  })

  /** The address this page presents, re-read on every commit. */
  const currentUrl = $derived.by(() => {
    void revision
    const location = router.getLocation()
    return location.pathname + location.search + location.hash
  })

  /** The collection request, re-issued when the selected view changes (React's `useQuery` key). */
  const rows = $derived.by(() => {
    void revision
    return scenario.read ? scenario.read($selection === 'saved') : undefined
  })
</script>

{#snippet listContent(route: { selection: string | undefined })}
  <output data-testid="rows"
    >{route.selection === undefined ? '' : (scenario.rows?.[route.selection] ?? '')}</output
  >
{/snippet}

<ListRouteNav
  aria-label={scenario.ariaLabel}
  {selections}
  defaultSelection={scenario.defaultSelection}
  pageParam={scenario.pageParam}
  list={scenario.list}
  linkClassName={scenario.linkClassName}
  id={scenario.navId}
  children={scenario.rows ? listContent : undefined}
/>
<output data-testid="url">{currentUrl}</output>
<output data-testid="page">{$page}</output>
{#if rows}
  {#await rows}
    <!-- React's QueryContent renders nothing until the rows arrive. -->
  {:then answered}
    <ul>
      {#each answered as row (row)}<li>{row}</li>{/each}
    </ul>
  {/await}
{/if}
<button
  type="button"
  onclick={() => {
    panel = scenario.nextPanel ?? 'details'
  }}>{scenario.buttonShowsPanel ? panel : 'Local details panel'}</button
>
<output data-testid="panel">{panel}</output>
