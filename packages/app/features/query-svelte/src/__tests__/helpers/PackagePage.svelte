<!--
  The documented detail page (the published example, in Svelte): pending for
  unfinished reads, "not found" only for HTTP 404 or a completed null, a load
  failure for every other error. The example's prefetch-on-intent link is
  pinned by the prefetch unit tests.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { getClient, isHttpError } from '@molecule/app-http'
  import type { QueryOptions } from '@molecule/app-query'

  import { useQuery } from '../../useQuery.js'

  interface PackageDocument {
    /** The package name. */
    name: string
    /** The package description. */
    description: string
  }

  let { name }: { name: string } = $props()

  const packageQuery = (packageName: string): QueryOptions<PackageDocument | null> => ({
    key: ['package', packageName],
    fetch: async (signal: AbortSignal): Promise<PackageDocument | null> => {
      try {
        const response = await getClient().get<PackageDocument | null>(
          `/data/packages/${encodeURIComponent(packageName)}.json`,
          { signal },
        )
        return response.data
      } catch (error) {
        if (isHttpError(error) && error.status === 404) return null
        throw error
      }
    },
  })

  // The options are read once at init, like React's options read per render.
  const query = useQuery(untrack(() => packageQuery(name)))
</script>

{#if $query.status === 'error'}
  <p role="alert">Unable to load package.</p>
{:else if $query.status === 'idle' || $query.status === 'loading'}
  <p role="status">Loading…</p>
{:else if $query.data == null}
  <p>Package not found.</p>
{:else}
  <article>{$query.data.name}</article>
{/if}
