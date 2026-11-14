<!--
  Test stub for `OAuthProviderLogo` (the mock in auth-ui.test.ts replaces the
  real package with this, the way React's own tests stub the logos package):
  an svg carrying the provider id, no real paths.
-->
<script lang="ts">
  let { provider }: { provider: string } = $props()
</script>

<svg data-logo data-provider={provider} xmlns="http://www.w3.org/2000/svg"></svg>
