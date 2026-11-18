<!--
  A minimal component whose init runs a caller-supplied function — how the unit
  tests mount a hook (`useAuthFormState`) so its `onMount`/`onDestroy` run.
-->
<script lang="ts">
  let { run }: { run: () => void } = $props()

  const call = (): void => run()
  call()
</script>
