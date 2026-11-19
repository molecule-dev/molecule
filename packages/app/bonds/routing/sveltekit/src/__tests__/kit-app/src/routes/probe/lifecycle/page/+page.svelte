<script lang="ts">
  // /probe/lifecycle/page: reads the location when it is created, the way
  // `@molecule/app-svelte`'s useRouter reads it (React's state initializer) — the case
  // asserts a page mounted by a navigation already sees the new location.
  import { recordFirstRender } from '../../../../lib/lifecycle-probe.js'
  import { appRouter } from '../../../../lib/probe.js'

  const router = appRouter()
  recordFirstRender(router.getLocation().pathname)
</script>

<p>page</p>
