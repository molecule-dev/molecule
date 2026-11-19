<!--
  Test host for the Input error/hint disambiguation: one Input instance starts
  with both an error and a hint (the error wins), then drops the error so the
  SAME field retargets its `aria-describedby` at the hint.
-->
<script lang="ts">
  import Input from '../components/Input.svelte'

  let { onClear = () => {} }: { onClear?: () => void } = $props()

  let withError = $state(true)
</script>

<button type="button" data-toggle onclick={() => (withError = false)}>toggle</button>
<Input
  label="Email"
  hint="We never share it"
  error={withError ? 'Invalid address' : undefined}
  clearable
  value={withError ? 'nope' : 'ok'}
  onChange={() => {}}
  {onClear}
/>
