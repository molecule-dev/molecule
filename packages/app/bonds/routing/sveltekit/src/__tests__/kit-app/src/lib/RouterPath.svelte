<!-- The current in-app path, as the bond's router reports it (React's `useLocation().pathname`). -->
<script lang="ts">
  import { onDestroy } from 'svelte'

  import { appRouter } from './probe.js'

  const router = appRouter()
  let revision = $state(0)
  onDestroy(
    router.subscribe(() => {
      revision += 1
    }),
  )
  const path = $derived.by(() => {
    void revision
    return router.getLocation().pathname
  })
</script>

<output data-path="">{path}</output>
