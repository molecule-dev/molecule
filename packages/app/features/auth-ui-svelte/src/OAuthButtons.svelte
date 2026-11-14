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
  import { toStore } from 'svelte/store'

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

  // The config is a store over the props, so a changed `oauthConfig` reaches the
  // hook on this mount (React re-renders the row with the new config). The hook
  // also reads it once during component init (the code-exchange half of the flow
  // starts there, exactly like React's mount effect) — untrack marks that
  // init-time read as deliberate instead of a stale capture.
  const oauth = untrack(() =>
    useOAuth(
      toStore(() => ({
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
      })),
    ),
  )

  // `oauth.providers` is read live, so it is read off the result, never destructured.
  const hasProviders = $derived(oauth.providers.length > 0)
</script>

{#if hasProviders}
  <div class={className}>
    <OAuthDivider labelKey={dividerKey} labelDefault={dividerDefault} />
    {#if error}
      <div class={cm.authFormError} role="alert" data-mol-id="oauth-error">{error}</div>
    {/if}
    <OAuthButtonRow
      providers={oauth.providers}
      onSelect={oauth.redirect}
      {iconSize}
      {iconMode}
      {showLabels}
    />
  </div>
{/if}
