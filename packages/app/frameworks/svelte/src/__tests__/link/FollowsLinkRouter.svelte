<!--
  Follows a destination a case changes, as a link does: the store `useLinkRouter` gives for a
  destination store, which an effect reads and records.
-->
<script lang="ts">
  import { writable } from 'svelte/store'

  import { useLinkRouter } from '../../context.js'

  let { seen }: { seen: unknown[] } = $props()

  const to = writable('https://elsewhere.example/page')
  const router = useLinkRouter(to)

  $effect(() => {
    seen.push($router)
  })

  /** Changes the destination the link follows, as a case changes the hook's argument. */
  export function setTo(next: string): void {
    to.set(next)
  }
</script>
