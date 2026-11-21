<!--
  A stand-in for the UI `Button` in the unit tests: a `<button>` carrying the
  `data-button` marker and every other attribute (the observable part of the
  real component, which is the UI kit's own conformance-tested behavior).
-->
<script lang="ts">
  let { children, variant: _variant, size: _size, ...rest } = $props()
</script>

<button data-button="" {...rest}>{@render children?.()}</button>
