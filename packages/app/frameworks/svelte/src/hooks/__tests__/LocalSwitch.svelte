<!-- A plain local switch: component state, no server commit. -->
<script lang="ts">
  let open = $state(false)
</script>

<button type="button" onclick={() => (open = !open)}>{String(open)}</button>
