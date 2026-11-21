<!--
  Test harness: renders the lightbox under test with a reactive props bag, so
  a test can write a prop and see the mounted element update.
-->
<script lang="ts">
  import type { Component } from 'svelte'

  import type { PhotoLightboxProps } from '../types.js'
  import type { PropBag } from './props.svelte.js'

  let { component: Target, bag }: { component: Component<PhotoLightboxProps>; bag: PropBag } =
    $props()
</script>

<Target {...bag.props} />
