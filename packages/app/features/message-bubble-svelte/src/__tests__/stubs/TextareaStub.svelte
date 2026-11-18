<!--
  The `Textarea` stub: a native <textarea> carrying the placeholder, disabled
  state and value, the same markers the React suite's stub renders.
-->
<script lang="ts">
  let {
    placeholder,
    disabled,
    value,
  }: { placeholder?: string; disabled?: boolean; value?: string } = $props()
</script>

<textarea data-textarea="" {placeholder} {disabled} {value}></textarea>
