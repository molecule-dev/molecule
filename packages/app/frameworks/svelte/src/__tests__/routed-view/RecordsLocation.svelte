<!--
  A page that stays mounted across a navigation: records what it showed each time it updated.
-->
<script lang="ts">
  import { useLocation, useParams, useQuery } from '../../hooks/index.js'

  let { renders, full = true }: { renders: string[]; full?: boolean } = $props()

  const location = useLocation()
  const params = useParams<{ id: string }>()
  const query = useQuery<{ tab?: string }>()
  const seen = $derived(
    full
      ? `${$location.pathname}${$location.search} id=${$params.id} tab=${$query.tab}`
      : $location.pathname,
  )

  $effect(() => {
    renders.push(seen)
  })
</script>

<p>{seen}</p>
