/**
 * React hook for the post-checkout return: verify the purchase with the API
 * from the APP origin, where the session cookie applies.
 *
 * @module
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'

import { useAuth } from './useAuth.js'
import { useHttpClient } from './useHttp.js'

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

/** State of the post-checkout verification. */
export interface UseVerifyPaymentReturnResult {
  /**
   * `idle` when this page load is not a checkout return (no transaction id in
   * the URL) or auth is still hydrating; `verifying` while the API call is in
   * flight; then `verified` or `failed`.
   */
  status: VerifyPaymentReturnStatus

  /** `true` when the URL identifies a purchase to verify. */
  isReturn: boolean

  /** The provider named by the URL (or the `provider` option). */
  provider: string | null

  /** The provider transaction/session id read from the URL. */
  transactionId: string | null

  /** Why verification failed, when it did. */
  error: Error | null

  /** Re-run the verification — wire this to a retry button. */
  retry: () => void
}

/**
 * Reads the payment id a provider put in the return URL and confirms the
 * purchase server-side with `POST /users/:id/verify-payment/:provider`.
 *
 * **This is why a hosted checkout returns the buyer to the APP and not the
 * API.** Session cookies are host-only on the app's origin, so a top-level
 * redirect from the provider straight to an authenticated API callback on a
 * different host arrives with NO credentials — it answers 401 and the paid plan
 * is never granted. The request this hook makes is a same-origin call from a
 * loaded app page, so the credentials apply. It waits for auth to hydrate
 * first: after the redirect the page is a cold load, and the session is
 * restored from the httpOnly cookie via `GET /users/me`.
 *
 * Verification is idempotent server-side (first-claim-wins on the transaction),
 * and this hook additionally runs at most once per transaction id per page.
 * Safe on pages that are also reached normally: with no id in the URL it stays
 * `idle` and issues no request.
 *
 * @param options - Provider fallback + lifecycle callbacks (see
 *   {@link UseVerifyPaymentReturnOptions}).
 * @returns The verification state (see {@link UseVerifyPaymentReturnResult}).
 *
 * @example
 * ```tsx
 * // /plan-updated — the page a provider returns the buyer to.
 * const { status, retry } = useVerifyPaymentReturn()
 *
 * if (status === 'verifying') return <Spinner />
 * if (status === 'failed') return <button onClick={retry}>Try again</button>
 * return <h1>Thank you!</h1>
 * ```
 */
export function useVerifyPaymentReturn(
  options: UseVerifyPaymentReturnOptions = {},
): UseVerifyPaymentReturnResult {
  const { provider: providerOption, enabled = true, cleanUrl = true, onVerified, onError } = options

  const http = useHttpClient()
  const { state, refresh } = useAuth<UserProfile>()

  const search = typeof window === 'undefined' ? '' : window.location.search
  const params = new URLSearchParams(search)
  const transactionId =
    TRANSACTION_ID_PARAMS.map((name) => params.get(name)).find((value) => !!value) ?? null
  const provider = params.get('provider') || providerOption || null

  const isReturn = Boolean(enabled && transactionId && provider)

  const [status, setStatus] = useState<VerifyPaymentReturnStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  // One attempt per transaction id per page — an effect that re-fires (auth
  // refresh, strict-mode double-invoke) must not re-POST a purchase.
  const attemptedRef = useRef<string | null>(null)

  // Callbacks are read through a ref so a caller passing inline functions does
  // not re-trigger the effect on every render.
  const callbacksRef = useRef({ onVerified, onError })
  callbacksRef.current = { onVerified, onError }

  const userId = state.user?.id ?? null

  const verify = useCallback(async () => {
    if (!transactionId || !provider || !userId) return

    setStatus('verifying')
    setError(null)

    try {
      await http.post(`/users/${userId}/verify-payment/${provider}`, {
        subscriptionId: transactionId,
      })
      // The plan on the cached profile is now stale — re-read it so the UI
      // (plan badges, gated features) reflects what was just paid for.
      await refresh().catch(() => {})
      setStatus('verified')
      callbacksRef.current.onVerified?.()

      if (cleanUrl && typeof window !== 'undefined' && window.history?.replaceState) {
        const url = new URL(window.location.href)
        for (const name of TRANSACTION_ID_PARAMS) url.searchParams.delete(name)
        url.searchParams.delete('provider')
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
      }
    } catch (caught) {
      const failure = caught instanceof Error ? caught : new Error(String(caught))
      setStatus('failed')
      setError(failure)
      callbacksRef.current.onError?.(failure)
    }
  }, [cleanUrl, http, provider, refresh, transactionId, userId])

  useEffect(() => {
    if (!isReturn || !transactionId) return
    // Auth is still hydrating from the httpOnly cookie — verifying now would
    // send the request unauthenticated.
    if (!state.initialized || !userId) return
    if (attemptedRef.current === transactionId) return

    attemptedRef.current = transactionId
    void verify()
  }, [isReturn, state.initialized, transactionId, userId, verify])

  const retry = useCallback(() => {
    attemptedRef.current = transactionId
    void verify()
  }, [transactionId, verify])

  return { status, isReturn, provider, transactionId, error, retry }
}
