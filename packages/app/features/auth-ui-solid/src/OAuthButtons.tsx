import { type Component, createSignal, Show } from 'solid-js'

import { OAuthButtons as OAuthButtonRow, OAuthDivider } from '@molecule/app-oauth-buttons-solid'
import { useOAuth, type UseOAuthConfig } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/** Props for {@link OAuthButtons}. */
export interface OAuthButtonsProps {
  /**
   * OAuth config object consumed by `useOAuth()` — the same shape the
   * binding's `useOAuth(config)` takes (`baseURL`, `oauthProviders`, an
   * optional `navigate` override, …).
   */
  oauthConfig: UseOAuthConfig
  /** Extra class applied to the outer wrapper. */
  className?: string
  /** Icon size in pixels. Defaults to 30. */
  iconSize?: number
  /** Logo color mode — `'brand'` (default, official multi-color) or `'mono'`. */
  iconMode?: 'brand' | 'mono'
  /** When true, render the provider label text next to the logo. */
  showLabels?: boolean
  /** Override the default "or continue with" divider text. */
  dividerKey?: string
  dividerDefault?: string
  /**
   * Called after a successful OAuth login (the session is already
   * established) — e.g. `() => navigate('/dashboard')`.
   */
  onSuccess?: () => void
  /**
   * Called when the OAuth callback exchange fails. The (already visible)
   * inline error message is passed through for hosts that also want to
   * surface it elsewhere.
   */
  onError?: (error: string) => void
}

/**
 * Config-driven OAuth provider button row rendered beneath a
 * login/signup form.
 *
 * This is the convenience layer over the primitives in
 * `@molecule/app-oauth-buttons-solid`: it reads `providers` + `redirect`
 * from `useOAuth(oauthConfig)`, then composes `<OAuthDivider>` (the "or
 * continue with" rule) above `<OAuthButtons>` (the button row). Apps
 * with an `oauthConfig` object use this; apps that already hold a raw
 * provider list use the lower-level `<OAuthButtons>` directly.
 *
 * The component also owns the CALLBACK half of the page-based flow:
 * `useOAuth` detects `?code&state` on the page this row is mounted on,
 * exchanges the code, and reports the outcome here — a failed exchange
 * (forged/expired code, state mismatch, provider rejection) renders a
 * VISIBLE inline error (`data-mol-id="oauth-error"`, `role="alert"`)
 * instead of failing silently, and a success fires `onSuccess` so the
 * host can navigate into the app.
 *
 * @param props - Component props (see {@link OAuthButtonsProps}).
 */
export const OAuthButtons: Component<OAuthButtonsProps> = (props) => {
  const cm = getClassMap()
  const [error, setError] = createSignal<string | null>(null)
  const { providers, redirect } = useOAuth({
    ...props.oauthConfig,
    onSuccess: () => {
      setError(null)
      props.onSuccess?.()
    },
    onError: (message: string) => {
      // The message is the api's (localized) error body or the hook's
      // fallback — render it so a failed callback is never invisible.
      setError(message)
      props.onError?.(message)
    },
  })

  return (
    <Show when={providers.length > 0}>
      <div class={props.className}>
        <OAuthDivider
          labelKey={props.dividerKey ?? 'oauth.orContinueWith'}
          labelDefault={props.dividerDefault ?? 'or continue with'}
        />
        <Show when={error()}>
          <div class={cm.authFormError} role="alert" data-mol-id="oauth-error">
            {error()}
          </div>
        </Show>
        <OAuthButtonRow
          providers={providers}
          onSelect={redirect}
          iconSize={props.iconSize ?? 30}
          iconMode={props.iconMode ?? 'brand'}
          showLabels={props.showLabels ?? false}
        />
      </div>
    </Show>
  )
}
