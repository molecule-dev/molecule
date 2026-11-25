<!--
  Asks `useLinkRouter` about each destination from inside a component init, recording what its
  store gave or threw.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { get } from 'svelte/store'

  import { useLinkRouter } from '../../context.js'

  let { destinations, seen }: { destinations: string[]; seen: unknown[] } = $props()

  // Asks once, at init: the case's destinations and its record are fixed for the host's whole run.
  untrack(() => {
    for (const to of destinations) {
      try {
        seen.push(get(useLinkRouter(to)))
      } catch (error) {
        seen.push(error)
      }
    }
  })
</script>
