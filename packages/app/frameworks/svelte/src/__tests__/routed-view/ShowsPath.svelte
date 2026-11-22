<!--
  Shows the path, as a layout computing its active item does, with a child that redirects.
-->
<script lang="ts">
  import { useLocation } from '../../hooks/index.js'
  import RedirectsOnMount from './RedirectsOnMount.svelte'

  const location = useLocation()
</script>

<p>{$location.pathname}<RedirectsOnMount /></p>
