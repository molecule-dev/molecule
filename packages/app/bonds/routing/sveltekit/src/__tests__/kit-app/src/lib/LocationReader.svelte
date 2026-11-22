<!--
  The router conformance cases' location reader: the pathname `@molecule/app-svelte`'s
  `useLocation` reads. The root layout mounts it beside the page, so it stays mounted across
  a navigation.
-->
<script lang="ts">
  import { useLocation } from '@molecule/app-svelte'

  const location = useLocation()
</script>

<output data-location="">{$location.pathname}</output>
