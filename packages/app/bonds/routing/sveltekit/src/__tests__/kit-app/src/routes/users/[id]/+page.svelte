<!-- /users/[id]: the id `@molecule/app-svelte`'s `useParams` reads, with no route definitions. -->
<script lang="ts">
  import { useParams } from '@molecule/app-svelte'

  const params = useParams()
</script>

<p>user {$params.id}</p>
