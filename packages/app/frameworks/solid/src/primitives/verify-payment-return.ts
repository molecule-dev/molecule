/**
 * The post-checkout return: verify the purchase with the API from the APP
 * origin, where the session cookie applies, under React's hook name.
 *
 * @module
 */

import { type Accessor, createEffect, createSignal, onCleanup, onMount } from 'solid-js'

import type { UserProfile } from '@molecule/app-auth'
import { getLogger } from '@molecule/app-logger'

import { useAuth } from './auth.js'
import { useHttpClient } from './http.js'

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

  /** Called when verification fails. */
  onError?: (error: Error) => void
}

/** State of the post-checkout verification (the same names React returns). */
export interface UseVerifyPaymentReturnResult {
  /**
   * `idle` when this page load is not a checkout return (no transaction id in
   * the URL) or auth is still hydrating; `verifying` while the API call is in
   * flight; then `verified` or `failed`. As an accessor.
   */
  status: Accessor<VerifyPaymentReturnStatus>

  /** Whether the URL identifies a purchase to verify, as an accessor. */
  isReturn: Accessor<boolean>

  /** The provider named by the URL (or the `provider` option), as an accessor. */
  provider: Accessor<string | null>

  /** The provider transaction/session id read from the URL, as an accessor. */
  transactionId: Accessor<string | null>

  /** Why verification failed, when it did, as an accessor. */
  error: Accessor<Error | null>

  /** Re-runs the verification — wire this to a retry button. */
  retry: () => void
}

/**
 * Reads the payment id a provider put in the return URL and confirms the
 * purchase server-side with `POST /users/:id/verify-payment/:provider`, under
 * React's hook name.
 *
 * Session cookies are host-only on the app's origin, so the verification must
 * run as a same-origin call from a loaded app page. It waits for auth to
 * hydrate first, runs at most once per transaction id per page, and stays
 * `idle` on pages reached normally (no id in the URL).
 *
 * If the component unmounts while the request is in flight, a verified
 * purchase still refreshes the cached profile (the plan is paid for), but the
 * hook calls neither `onVerified` nor `onError` and leaves the URL alone. A
 * failure after unmount is logged instead.
 *
 * @param options - Provider fallback + lifecycle callbacks.
 * @returns The verification state, as accessors, and `retry`.
 */
export function useVerifyPaymentReturn(
  options: UseVerifyPaymentReturnOptions = {},
): UseVerifyPaymentReturnResult {
  const { provider: providerOption, enabled = true, cleanUrl = true, onVerified, onError } = options

  const http = useHttpClient()
  const { state, refresh } = useAuth<UserProfile>()

  // React re-derives these from `window.location` on every render, so a URL
  // the hook itself cleans (cleanUrl) is reflected in the next snapshot. A
  // Solid component body runs once, so the fields are accessors that read the
  // address bar when asked.
  const searchParams = (): URLSearchParams =>
    new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const readTransactionId = (): string | null =>
    TRANSACTION_ID_PARAMS.map((name) => searchParams().get(name)).find((value) => !!value) ?? null
  const readProvider = (): string | null => searchParams().get('provider') || providerOption || null
  const readIsReturn = (): boolean => Boolean(enabled && readTransactionId() && readProvider())

  const [status, setStatus] = createSignal<VerifyPaymentReturnStatus>('idle')
  const [error, setError] = createSignal<Error | null>(null)
  // One attempt per transaction id per page — a re-trigger (auth refresh,
  // StrictMode double-invoke) must not re-POST a purchase.
  let attempted: string | null = null

  /** The callbacks read at settle time (a caller passing inline functions is fine). */
  const callbacks = (): { onVerified?: () => void; onError?: (error: Error) => void } => ({
    onVerified,
    onError,
  })

  // Whether the component is mounted when a verification settles.
  let mounted = false
  onMount(() => {
    mounted = true
  })
  onCleanup(() => {
    mounted = false
  })

  const verify = async (): Promise<void> => {
    const userId = (state().user?.id ?? null) as string | null
    const transactionId = readTransactionId()
    const provider = readProvider()
    if (!transactionId || !provider || !userId) return

    setStatus('verifying')
    setError(null)

    try {
      await http.post(`/users/${userId}/verify-payment/${provider}`, {
        subscriptionId: transactionId,
      })
      // The plan on the cached profile is now stale — re-read it so the UI
      // reflects what was just paid for.
      await refresh().catch((refreshError: unknown) => {
        // The payment is verified either way; only the cached plan may lag.
        getLogger('useVerifyPaymentReturn').warn('Refreshing the profile after payment failed', {
          error: refreshError,
        })
      })
      if (!mounted) return
      setStatus('verified')
      callbacks().onVerified?.()

      if (cleanUrl && typeof window !== 'undefined' && window.history?.replaceState) {
        const url = new URL(window.location.href)
        for (const name of TRANSACTION_ID_PARAMS) url.searchParams.delete(name)
        url.searchParams.delete('provider')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      }
    } catch (caught) {
      const failure = caught instanceof Error ? caught : new Error(String(caught))
      if (!mounted) {
        getLogger('useVerifyPaymentReturn').warn(
          'Verifying the payment failed after the page unmounted',
          { error: failure, provider },
        )
        return
      }
      setStatus('failed')
      setError(failure)
      callbacks().onError?.(failure)
    }
  }

  // Auth is still hydrating after the redirect — verifying now would send the
  // request unauthenticated. Runs when the auth state changes (React's effect
  // with [isReturn, state.initialized, transactionId, userId, verify] deps).
  createEffect(() => {
    const current = state()
    const transactionId = readTransactionId()
    if (!readIsReturn() || !transactionId) return
    if (!current.initialized || !current.user?.id) return
    if (attempted === transactionId) return

    attempted = transactionId
    void verify()
  })

  const retry = (): void => {
    attempted = readTransactionId()
    void verify()
  }

  return {
    status,
    isReturn: readIsReturn,
    provider: readProvider,
    transactionId: readTransactionId,
    error,
    retry,
  }
}
