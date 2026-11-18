<!--
  IconStub: records the glyph name the editor renders, the way the React
  suite's `@molecule/app-ui-react` Icon stub does. A mocked cm value may be a
  function (the test's ClassMap proxy echoes each token as `() => token`), so
  a function class token is called first.
-->
<script lang="ts">
  let { name, className }: { name: string; className?: unknown } = $props()
</script>

<i data-icon={name} class={typeof className === 'function' ? className() : className}></i>
