<!--
  Calls `useLinkRouter` with no destination from inside a component init, then the function it
  gave for each destination, recording what it gave or threw.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useLinkRouter } from '../../context.js'

  let { destinations, seen }: { destinations: string[]; seen: unknown[] } = $props()

  const linkRouter = useLinkRouter()
  // Asks once, at init: the case's destinations and its record are fixed for the host's whole run.
  untrack(() => {
    for (const to of destinations) {
      try {
        seen.push(linkRouter(to))
      } catch (error) {
        seen.push(error)
      }
    }
  })
</script>
