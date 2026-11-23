<!--
  Test host: renders the AuthModalMount under a `<div>` or a `<section>` by
  `bag.phase`, so flipping it remounts the mount under another parent the way a
  host that changes layout does.
-->
<script lang="ts">
  import AuthModalMount from '../AuthModalMount.svelte'

  let { bag, oauthConfig }: { bag: { phase: 'first' | 'second' }; oauthConfig: object } = $props()
</script>

{#if bag.phase === 'first'}
  <div><AuthModalMount {oauthConfig} /></div>
{:else}
  <section><AuthModalMount {oauthConfig} /></section>
{/if}
