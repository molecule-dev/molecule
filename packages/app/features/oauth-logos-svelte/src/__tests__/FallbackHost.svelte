<!--
  Test host: renders the dispatcher with an explicit `fallback` snippet, the
  only way a test can hand a component a snippet prop.
-->
<script lang="ts">
  import OAuthProviderLogo from '../OAuthProviderLogo.svelte'

  let { provider }: { provider: string } = $props()
</script>

{#snippet fallback()}<span>n/a</span>{/snippet}
<OAuthProviderLogo {provider} {fallback} />
