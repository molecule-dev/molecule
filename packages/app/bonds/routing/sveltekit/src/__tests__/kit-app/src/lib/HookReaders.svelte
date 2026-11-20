<!--
  The Svelte form of React's `Settings` component in the bond's `hooks-without-provider`
  cases: it reads the bond's four hooks — `useMoleculeRouter`, `useMoleculeQuery`,
  `useMoleculeNavigate` and `useIsActive` — and renders what each one answers, plus the
  two buttons React's component renders. The root layout mounts it below the provider, the
  way React mounts `Settings` inside its router but outside the routes, so it stays mounted
  across a navigation.
-->
<script lang="ts">
  import { onDestroy } from 'svelte'

  import {
    useIsActive,
    useMoleculeNavigate,
    useMoleculeQuery,
    useMoleculeRouter,
  } from '../../../../index.js'

  const router = useMoleculeRouter()
  const navigate = useMoleculeNavigate()
  const query = useMoleculeQuery()
  const active = useIsActive('/settings', false)
  const exact = useIsActive('/settings', true)
  const other = useIsActive('/other')

  // Every committed navigation bumps this, so the location readers below re-read it; the
  // stores above re-emit on the same notification.
  let revision = $state(0)
  onDestroy(
    router.subscribe(() => {
      revision += 1
    }),
  )

  const view = $derived.by(() => {
    void revision
    const location = router.getLocation()
    return {
      query: JSON.stringify($query),
      active: String($active),
      activePaths: JSON.stringify([$active, $exact, $other]),
      location: location.pathname + location.search + location.hash,
      state: location.state === undefined ? '' : JSON.stringify(location.state),
      params: JSON.stringify(router.getParams()),
      hash: location.hash,
    }
  })
</script>

<output aria-label="query">{view.query}</output>
<output aria-label="active">{view.active}</output>
<output aria-label="active-paths">{view.activePaths}</output>
<output aria-label="location">{view.location}</output>
<output aria-label="state">{view.state}</output>
<output aria-label="params">{view.params}</output>
<output aria-label="hash">{view.hash}</output>
<button id="profile-tab" onclick={() => navigate('?tab=profile', { state: { source: 'tabs' } })}>
  Profile tab
</button>
<button id="preferences" onclick={() => router.navigate('/preferences?tab=notifications#email')}>
  Preferences
</button>
<button id="preferences-profile" onclick={() => navigate('/preferences?tab=profile')}>
  Preferences profile
</button>
<button
  id="to-settings-personal"
  onclick={() => navigate('/settings/personal?tab=security', { state: { source: 'tabs' } })}
>
  Personal settings
</button>
