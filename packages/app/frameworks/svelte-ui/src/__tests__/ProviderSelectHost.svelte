<!--
  Test host for the Select placeholder/clearable test: a re-render drops the
  placeholder, so the same select must then render the clear option instead
  of a second value="" option.
-->
<script lang="ts">
  import Select from '../components/Select.svelte'

  let withPlaceholder = $state(true)
</script>

<button type="button" data-toggle onclick={() => (withPlaceholder = !withPlaceholder)}
  >toggle</button
>
<Select
  options={[{ value: 'a', label: 'A' }]}
  placeholder={withPlaceholder ? 'Choose one' : undefined}
  clearable
  value=""
  onValueChange={() => {}}
/>
