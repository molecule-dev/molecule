<!--
  OAuthProviderLogo: dispatcher — renders the canonical logo for a given
  provider id, or the `fallback` snippet when the id has no registered
  logo. Use this in OAuth button rows so the button chrome (padding,
  radius, width, background) stays per-app while the logo itself is
  identical across every consumer.
-->
<script lang="ts">
  import AppleLogo from './AppleLogo.svelte'
  import DiscordLogo from './DiscordLogo.svelte'
  import FacebookLogo from './FacebookLogo.svelte'
  import GitHubLogo from './GitHubLogo.svelte'
  import GitLabLogo from './GitLabLogo.svelte'
  import GoogleLogo from './GoogleLogo.svelte'
  import LinkedInLogo from './LinkedInLogo.svelte'
  import MicrosoftLogo from './MicrosoftLogo.svelte'
  import TwitterLogo from './TwitterLogo.svelte'
  import type { OAuthProviderLogoProps } from './types.js'

  let { provider, fallback, ...rest }: OAuthProviderLogoProps = $props()
</script>

{#if provider === 'github'}
  <GitHubLogo {...rest} />
{:else if provider === 'gitlab'}
  <GitLabLogo {...rest} />
{:else if provider === 'google'}
  <GoogleLogo {...rest} />
{:else if provider === 'twitter' || provider === 'x'}
  <TwitterLogo {...rest} />
{:else if provider === 'apple'}
  <AppleLogo {...rest} />
{:else if provider === 'facebook'}
  <FacebookLogo {...rest} />
{:else if provider === 'microsoft'}
  <MicrosoftLogo {...rest} />
{:else if provider === 'linkedin'}
  <LinkedInLogo {...rest} />
{:else if provider === 'discord'}
  <DiscordLogo {...rest} />
{:else}
  {@render fallback?.()}
{/if}
