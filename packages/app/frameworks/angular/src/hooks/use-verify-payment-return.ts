/**
 * Post-checkout return verification, mirroring `useVerifyPaymentReturn` from
 * `@molecule/app-react`.
 *
 * @module
 */

import { computed, DestroyRef, effect, inject, type Signal, signal } from '@angular/core'

import type { UserProfile } from '@molecule/app-auth'
import { getLogger } from '@molecule/app-logger'

import { useAuth } from './use-auth.js'
import { useHttpClient } from './use-http.js'

/** Query parameters a payment provider may use for its transaction id. */
const TRANSACTION_ID_PARAMS = [
  // What `resolveCheckoutRedirectUrls` (@molecule/api-payments) asks providers
  // to substitute — Stripe's `{CHECKOUT_SESSION_ID}`.
  'sessionId',
  'session_id',
  'subscriptionId',
  // PayPal appends its OWN names to the return URL after buyer approval.
  'subscription_id',
  'token',
] as const

/** How far the return-page verification has got. */
export type VerifyPaymentReturnStatus = 'idle' | 'verifying' | 'verified' | 'failed'

/** Options for {@link useVerifyPaymentReturn}. */
export interface UseVerifyPaymentReturnOptions {
  /**
   * Provider name to verify with, when the return URL carries no `provider`
   * query parameter. Leave unset to verify only what the URL names.
   */
  provider?: string

  /** Set `false` to skip verification entirely (e.g. behind a feature flag). */
  enabled?: boolean

  /**
   * Remove the provider's query parameters from the address bar once the
   * purchase is verified, so a reload (or a shared link) cannot replay the
   * verification. Defaults to `true`.
   */
  cleanUrl?: boolean

  /** Called once, after the purchase verifies. */
  onVerified?: () => void

  /**
   * Called when verification fails.
   *
   * @param error - The failure.
   */
  onError?: (error: Error) => void
}

/** The address-bar view of a checkout return. */
interface UrlReturnState {
  /** The provider transaction/session id read from the URL, or `null`. */
  transactionId: string | null
  /** The provider named by the URL (or the `provider` option), or `null`. */
  provider: string | null
  /** Whether the URL identifies a purchase to verify. */
  isReturn: boolean
}

/** Result of {@link useVerifyPaymentReturn}: the state fields as signals. */
export interface UseVerifyPaymentReturnResult {
  /**
   * `idle` when this page load is not a checkout return (no transaction id in
   * the URL) or auth is still hydrating; `verifying` while the API call is in
   * flight; then `verified` or `failed`.
   */
  readonly status: Signal<VerifyPaymentReturnStatus>

  /**
   * `true` when the URL identifies a purchase to verify. A `cleanUrl` rewrite
   * after a verified purchase clears it, as React's per-render URL read does.
   */
  readonly isReturn: Signal<boolean>

  /** The provider named by the URL (or the `provider` option). */
  readonly provider: Signal<string | null>

  /** The provider transaction/session id read from the URL. */
  readonly transactionId: Signal<string | null>

  /** Why verification failed, when it did. */
  readonly error: Signal<Error | null>

  /** Re-runs the verification — wire this to a retry button. */
  retry: () => void
}

/**
 * Reads the payment id a provider put in the return URL and confirms the
 * purchase server-side with `POST /users/:id/verify-payment/:provider`. Call
 * it in an injection context (a component field initializer or constructor).
 *
 * **This is why a hosted checkout returns the buyer to the APP and not the
 * API.** Session cookies are host-only on the app's origin, so a top-level
 * redirect from the provider straight to an authenticated API callback on a
 * different host arrives with NO credentials — it answers 401 and the paid
 * plan is never granted. The request this hook makes is a same-origin call
 * from a loaded app page, so the credentials apply. It waits for auth to
 * hydrate first: after the redirect the page is a cold load, and the session
 * is restored from the httpOnly cookie via `GET /users/me`.
 *
 * Verification is idempotent server-side (first-claim-wins on the
 * transaction), and this hook additionally runs at most once per transaction
 * id per page. Safe on pages that are also reached normally: with no id in the
 * URL it stays `idle` and issues no request.
 *
 * If the component unmounts while the request is in flight, a verified
 * purchase still refreshes the cached profile (the plan is paid for), but the
 * hook calls neither `onVerified` nor `onError` and leaves the URL alone: by
 * then the address may belong to another page. A failure after unmount is
 * logged instead.
 *
 * @param options - Provider fallback + lifecycle callbacks (see
 *   {@link UseVerifyPaymentReturnOptions}).
 * @returns The verification state as signals.
 */
export function useVerifyPaymentReturn(
  options: UseVerifyPaymentReturnOptions = {},
): UseVerifyPaymentReturnResult {
  const { provider: providerOption, enabled = true, cleanUrl = true, onVerified, onError } = options

  const http = useHttpClient()
  const { state, refresh } = useAuth<UserProfile>()
  const destroyRef = inject(DestroyRef)

  const search = typeof window === 'undefined' ? '' : window.location.search
  const params = new URLSearchParams(search)
  const transactionId =
    TRANSACTION_ID_PARAMS.map((name) => params.get(name)).find((value) => !!value) ?? null
  const provider = params.get('provider') || providerOption || null

  const isReturn = Boolean(enabled && transactionId && provider)

  const status = signal<VerifyPaymentReturnStatus>('idle')
  const error = signal<Error | null>(null)
  // React derives these from `window.location.search` on every render, so the
  // cleanUrl rewrite below makes them read as absent. A signal reproduces that
  // observable behavior after the rewrite.
  const returnState = signal<UrlReturnState>({
    transactionId,
    provider,
    isReturn,
  })
  // One attempt per transaction id per page — an effect that re-fires (auth
  // refresh, strict-mode double-invoke) must not re-POST a purchase.
  let attempted: string | null = null

  // Whether the component is mounted when a verification settles.
  let mounted = true
  destroyRef.onDestroy(() => {
    mounted = false
  })

  const verify = async (): Promise<void> => {
    const { transactionId: pendingId, provider: pendingProvider } = returnState()
    const userId = state().user?.id
    if (!pendingId || !pendingProvider || !userId) return

    status.set('verifying')
    error.set(null)

    try {
      await http.post(`/users/${userId}/verify-payment/${pendingProvider}`, {
        subscriptionId: pendingId,
      })
      // The plan on the cached profile is now stale — re-read it so the UI
      // (plan badges, gated features) reflects what was just paid for.
      await refresh().catch((refreshError: unknown) => {
        // The payment is verified either way; only the cached plan may lag until the next refresh.
        getLogger('useVerifyPaymentReturn').warn('Refreshing the profile after payment failed', {
          error: refreshError,
        })
      })
      if (!mounted) return
      status.set('verified')
      onVerified?.()

      if (cleanUrl && typeof window !== 'undefined' && window.history?.replaceState) {
        const url = new URL(window.location.href)
        for (const name of TRANSACTION_ID_PARAMS) url.searchParams.delete(name)
        url.searchParams.delete('provider')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
        // React re-reads the address bar when it re-renders for the `verified`
        // status, so the cleaned URL's missing parameters are what it reports.
        const cleaned = typeof window === 'undefined' ? '' : window.location.search
        const cleanedParams = new URLSearchParams(cleaned)
        const cleanedId =
          TRANSACTION_ID_PARAMS.map((name) => cleanedParams.get(name)).find((value) => !!value) ??
          null
        const cleanedProvider = cleanedParams.get('provider') || providerOption || null
        returnState.set({
          transactionId: cleanedId,
          provider: cleanedProvider,
          isReturn: Boolean(enabled && cleanedId && cleanedProvider),
        })
      }
    } catch (caught) {
      const failure = caught instanceof Error ? caught : new Error(String(caught))
      if (!mounted) {
        getLogger('useVerifyPaymentReturn').warn(
          'Verifying the payment failed after the page unmounted',
          { error: failure, provider: pendingProvider },
        )
        return
      }
      status.set('failed')
      error.set(failure)
      onError?.(failure)
    }
  }

  // The attempt effect: React's effect over [isReturn, state.initialized,
  // transactionId, userId, verify]. In Angular the auth state arrives through
  // the state signal, so the effect re-runs when hydration lands.
  effect(() => {
    const current = state()
    const currentReturn = returnState()
    const userId = current.user?.id ?? null
    if (!currentReturn.isReturn || !currentReturn.transactionId) return
    // Auth is still hydrating from the httpOnly cookie — verifying now would
    // send the request unauthenticated.
    if (!current.initialized || !userId) return
    if (attempted === currentReturn.transactionId) return

    attempted = currentReturn.transactionId
    void verify()
  })

  const retry = (): void => {
    attempted = returnState().transactionId
    void verify()
  }

  return {
    status: status.asReadonly(),
    isReturn: computed(() => returnState().isReturn),
    provider: computed(() => returnState().provider),
    transactionId: computed(() => returnState().transactionId),
    error: error.asReadonly(),
    retry,
  }
}
