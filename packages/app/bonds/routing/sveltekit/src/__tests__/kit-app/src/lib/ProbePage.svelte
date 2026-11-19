<!--
  The Svelte form of a bond's `ListRouteNav`: there is no component to port — a SvelteKit
  app renders its navigation as markup over the same declaration, and kit's own link handler
  takes a plain `<a href>` — so this probe page renders exactly the DOM React's
  `ListRouteNav` does (`nav > [ul > li >] a|span`, `data-mol-id`, `aria-current`,
  `data-state`) from `resolveListRoute`, the list rules every framework's `useListRoute`
  shares, and the router the test app's root layout built.
-->
<script lang="ts">
  import { resolve } from '$app/paths'
  import { onDestroy } from 'svelte'

  import { generatePath, resolveListRoute } from '@molecule/app-routing'

  import { appRouter, probeScenario, type ProbeSelection } from './probe.js'

  const scenario = probeScenario()
  const router = appRouter()

  // The router notifies once per committed navigation; each notification re-resolves the list.
  let revision = $state(0)
  onDestroy(
    router.subscribe(() => {
      revision += 1
    }),
  )

  let panel = $state(scenario.initialPanel ?? 'preview')

  interface LinkModel {
    selection: string
    label: string
    href: string
    active: boolean
    disabled: boolean
    className: string | undefined
    state: 'active' | 'inactive'
  }

  const view = $derived.by(() => {
    void revision
    const location = router.getLocation()
    const routeParams = { ...router.getParams() }
    // Resolve per-choice params before matching as well as before building links:
    // two choices can share /folders/:folder while naming different folders.
    const selections: Record<string, ProbeSelection> = { ...scenario.selections }
    for (const [selection, item] of Object.entries(scenario.selections)) {
      if (item.params) {
        selections[selection] = {
          ...item,
          path: generatePath(item.path, { ...routeParams, ...item.params }),
        }
      }
    }
    const list = resolveListRoute(
      { location, routeParams },
      {
        selections,
        defaultSelection: scenario.defaultSelection,
        pageParam: scenario.pageParam,
      },
      (path, options) => router.navigate(path, options),
    )
    const links: LinkModel[] = Object.entries(scenario.selections).map(([selection, item]) => {
      const active = list.selection === selection
      const disabled = item.disabled === true
      const linkClassName = scenario.linkClassName
      return {
        selection,
        label: item.label,
        href: list.href({ selection }),
        active,
        disabled,
        className:
          typeof linkClassName === 'function'
            ? linkClassName({ selection, active, disabled })
            : linkClassName,
        state: active ? 'active' : 'inactive',
      }
    })
    return {
      list,
      links,
      location,
      rows: scenario.read ? scenario.read(list.selection === 'saved') : undefined,
    }
  })
</script>

{#snippet choice(link: LinkModel)}
  {#if link.disabled}
    <span
      class={link.className}
      data-state={link.state}
      data-mol-id="list-route-{link.selection}"
      role="link"
      aria-disabled="true">{link.label}</span
    >
  {:else}
    <a
      class={link.className}
      data-state={link.state}
      data-mol-id="list-route-{link.selection}"
      aria-current={link.active ? 'page' : undefined}
      href={resolve(link.href)}>{link.label}</a
    >
  {/if}
{/snippet}

<nav id={scenario.navId} aria-label={scenario.ariaLabel}>
  {#if scenario.list}
    <ul class={scenario.list.className}>
      {#each view.links as link (link.selection)}
        <li class={scenario.list.itemClassName}>{@render choice(link)}</li>
      {/each}
    </ul>
  {:else}
    {#each view.links as link (link.selection)}
      {@render choice(link)}
    {/each}
  {/if}
</nav>
<output data-testid="url"
  >{view.location.pathname + view.location.search + view.location.hash}</output
>
<output data-testid="page">{view.list.page}</output>
{#if scenario.rows}
  <output data-testid="rows"
    >{view.list.selection === undefined ? '' : (scenario.rows[view.list.selection] ?? '')}</output
  >
{/if}
{#if view.rows}
  {#await view.rows}
    <!-- React's QueryContent renders nothing until the rows arrive. -->
  {:then rows}
    <ul>
      {#each rows as row (row)}<li>{row}</li>{/each}
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
