<!--
  Redirects as it mounts, as a guard does. Its onMount runs before its parent's.
-->
<script lang="ts">
  import { onMount } from 'svelte'

  import { useNavigate } from '../../hooks/index.js'

  const navigate = useNavigate()
  onMount(() => navigate('/moved'))
</script>
