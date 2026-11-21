<!--
  Test host: renders the AuthModal from a reactive prop bag, so a test can
  flip `open` / `captchaSolved` the way React's tests rerender with new props.
-->
<script lang="ts">
  import AuthModal from '../AuthModal.svelte'
  import type { PropBag } from './props-bag.svelte.js'

  let { bag }: { bag: PropBag } = $props()
</script>

<AuthModal {...bag.props} />
