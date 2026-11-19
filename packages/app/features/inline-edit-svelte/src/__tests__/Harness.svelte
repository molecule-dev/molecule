<!--
  Test harness: renders the component under test with a reactive props bag, so
  a test can write a prop and see the mounted element update.
-->
<script lang="ts">
  import type { Component } from 'svelte'

  import type { InlineEditProps } from '../types.js'
  import type { PropBag } from './props.svelte.js'

  let { component: Target, bag }: { component: Component<InlineEditProps>; bag: PropBag } = $props()
</script>

<Target {...bag.props} />
