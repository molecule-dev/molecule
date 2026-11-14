<!--
  OAuthButtons: the Svelte counterpart of `@molecule/app-auth-ui-react`'s
  `OAuthButtons` — the config-driven OAuth provider button row rendered
  beneath a login/signup form. Reads `providers` + `redirect` from
  `useOAuth(oauthConfig)`, composes `OAuthDivider` (the "or continue with"
  rule) above the `OAuthButtons` row from
  `@molecule/app-oauth-buttons-svelte`, and owns the CALLBACK half of the
  page-based flow: a failed code exchange renders a VISIBLE inline error
  (`data-mol-id="oauth-error"`, `role="alert"`) instead of failing silently.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { OAuthButtons as OAuthButtonRow, OAuthDivider } from '@molecule/app-oauth-buttons-svelte'
  import { useOAuth } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { OAuthButtonsProps } from './types.js'

  let {
    oauthConfig,
    className,
    iconSize = 30,
    iconMode = 'brand',
    showLabels = false,
    dividerKey = 'oauth.orContinueWith',
    dividerDefault = 'or continue with',
    onSuccess,
    onError,
  }: OAuthButtonsProps = $props()

  const cm = $derived(getClassMap())

  /** The callback exchange's failure message, rendered inline (null hides the block). */
  let error = $state<string | null>(null)

  // The hook reads its config once, during component init (the code-exchange
  // half of the flow starts there, exactly like React's mount effect) — untrack
  // marks that once-only read as deliberate instead of a stale capture.
  const { providers, redirect } = untrack(() =>
    useOAuth({
      ...oauthConfig,
      onSuccess: () => {
        error = null
        onSuccess?.()
      },
      onError: (message: string) => {
        // The message is the api's (localized) error body or the hook's
        // fallback — render it so a failed callback is never invisible.
        error = message
        onError?.(message)
      },
    }),
  )

  const hasProviders = $derived(providers.length > 0)
</script>

{#if hasProviders}
  <div class={className}>
    <OAuthDivider labelKey={dividerKey} labelDefault={dividerDefault} />
    {#if error}
      <div class={cm.authFormError} role="alert" data-mol-id="oauth-error">{error}</div>
    {/if}
    <OAuthButtonRow {providers} onSelect={redirect} {iconSize} {iconMode} {showLabels} />
  </div>
{/if}
