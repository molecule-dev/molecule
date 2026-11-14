/**
 * `<OAuthButtons />` — the config-driven OAuth row for Vue apps.
 *
 * @module
 */
import { defineComponent, h, type PropType, ref, type VNode } from 'vue'

import { OAuthButtons as OAuthButtonRow, OAuthDivider } from '@molecule/app-oauth-buttons-vue'
import { getClassMap } from '@molecule/app-ui'
import { useOAuth, type UseOAuthConfig } from '@molecule/app-vue'

/** Props for {@link OAuthButtons}. */
export interface OAuthButtonsProps {
  /** The app's OAuth config (`oauthConfig` in its `config.ts`), passed to `useOAuth()`. */
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
 * The Vue counterpart of `@molecule/app-auth-ui-react`'s `OAuthButtons`,
 * with the same props and the same DOM. It is the convenience layer over
 * the primitives in `@molecule/app-oauth-buttons-vue`: it reads
 * `providers` + `redirect` from `useOAuth(oauthConfig)`, then composes
 * `<OAuthDivider>` (the "or continue with" rule) above `<OAuthButtons>`
 * (the button row). Apps with an `oauthConfig` object use this; apps that
 * already hold a raw provider list use the lower-level row directly.
 *
 * The component also owns the CALLBACK half of the page-based flow:
 * `useOAuth` detects `?code&state` on the page this row is mounted on,
 * exchanges the code, and reports the outcome here — a failed exchange
 * (forged/expired code, state mismatch, provider rejection) renders a
 * VISIBLE inline error (`data-mol-id="oauth-error"`, `role="alert"`)
 * instead of failing silently, and a success fires `onSuccess` so the
 * host can navigate into the app. The two callbacks are Vue listeners:
 * bind them as `@success="…"` / `@error="…"` (or the `onSuccess` /
 * `onError` props).
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { OAuthButtons } from '@molecule/app-auth-ui-vue'
 * import { oauthConfig } from './config.js'
 *
 * // On the Login/Signup page (the OAuth redirect must land back here):
 * export const LoginPage = defineComponent({
 *   setup() {
 *     return () =>
 *       h(OAuthButtons, {
 *         oauthConfig,
 *         showLabels: true,
 *         onSuccess: () => navigate('/dashboard'),
 *       })
 *   },
 * })
 * ```
 */
export const OAuthButtons = defineComponent({
  name: 'OAuthButtons',
  props: {
    oauthConfig: { type: Object as PropType<UseOAuthConfig>, required: true },
    className: String,
    iconSize: { type: Number, default: 30 },
    iconMode: { type: String as PropType<'brand' | 'mono'>, default: 'brand' },
    showLabels: { type: Boolean, default: false },
    dividerKey: { type: String, default: 'oauth.orContinueWith' },
    dividerDefault: { type: String, default: 'or continue with' },
  },
  emits: {
    /** Called after a successful OAuth login (the session is already established). */
    success: () => true,
    /** Called when the OAuth callback exchange fails, with the visible error message. */
    error: (message: string) => typeof message === 'string',
  },
  setup(props, { emit }) {
    const cm = getClassMap()
    const error = ref<string | null>(null)
    // A getter over the props, so a changed `oauthConfig` reaches the composable
    // on this mount (React re-renders the row with the new config).
    const { providers, redirect } = useOAuth(() => ({
      ...props.oauthConfig,
      onSuccess: () => {
        error.value = null
        emit('success')
      },
      onError: (message: string) => {
        // The message is the api's (localized) error body or the hook's
        // fallback — render it so a failed callback is never invisible.
        error.value = message
        emit('error', message)
      },
    }))

    return (): VNode | null => {
      if (!providers.value.length) return null

      return h('div', { class: props.className }, [
        h(OAuthDivider, { labelKey: props.dividerKey, labelDefault: props.dividerDefault }),
        error.value
          ? h(
              'div',
              { class: cm.authFormError, role: 'alert', 'data-mol-id': 'oauth-error' },
              error.value,
            )
          : null,
        h(OAuthButtonRow, {
          providers: providers.value,
          onSelect: redirect,
          iconSize: props.iconSize,
          iconMode: props.iconMode,
          showLabels: props.showLabels,
        }),
      ])
    }
  },
})
