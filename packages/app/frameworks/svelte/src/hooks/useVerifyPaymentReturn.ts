/**
 * Svelte hook for the post-checkout return: verify the purchase with the API
 * from the APP origin, where the session cookie applies. Ports React's
 * `useVerifyPaymentReturn`.
 *
 * @module
 */

import { onDestroy } from 'svelte'
import { type Readable, writable } from 'svelte/store'

import type { AuthState, UserProfile } from '@molecule/app-auth'
import { getLogger } from '@molecule/app-logger'

import { useHttpClient } from '../context.js'
import { useAuth } from './useAuth.js'

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
  status: Readable<VerifyPaymentReturnStatus>

  /** `true` when the URL identifies a purchase to verify. */
  isReturn: Readable<boolean>

  /** The provider named by the URL (or the `provider` option). */
  provider: Readable<string | null>

  /** The provider transaction/session id read from the URL. */
  transactionId: Readable<string | null>

  /** Why verification failed, when it did. */
  error: Readable<Error | null>

  /** Re-run the verification — wire this to a retry button. */
  retry: () => void
}

/**
 * Reads the payment id a provider put in the return URL and confirms the
 * purchase server-side with `POST /users/:id/verify-payment/:provider`,
 * React's `useVerifyPaymentReturn` in Svelte's idiom: call it during component
 * init under `setMoleculeContext({ auth, http })`.
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
 * If the component unmounts while the request is in flight, a verified
 * purchase still refreshes the cached profile (the plan is paid for), but the
 * hook calls neither `onVerified` nor `onError` and leaves the URL alone: by
 * then the address may belong to another page. A failure after unmount is
 * logged instead.
 *
 * @param options - Provider fallback + lifecycle callbacks (see
 *   {@link UseVerifyPaymentReturnOptions}).
 * @returns The verification state (see {@link UseVerifyPaymentReturnResult}).
 * @example
 * ```svelte
 * <!-- /plan-updated — the page a provider returns the buyer to. -->
 * <script>
 *   import { useVerifyPaymentReturn } from '@molecule/app-svelte'
 *   const { status, retry } = useVerifyPaymentReturn()
 * </script>
 *
 * {#if $status === 'failed'}<button onclick={retry}>Try again</button>{/if}
 * ```
 */
export function useVerifyPaymentReturn(
  options: UseVerifyPaymentReturnOptions = {},
): UseVerifyPaymentReturnResult {
  const { provider: providerOption, enabled = true, cleanUrl = true, onVerified, onError } = options

  const http = useHttpClient()
  const { state: authState, refresh } = useAuth<UserProfile>()

  // The URL-derived fields are re-read the way React's re-render is: on every
  // auth change and after the verified path cleans the address, so a cleaned
  // URL reads as "no transaction" the moment the hook renders again.
  const transactionId = writable<string | null>(null)
  const provider = writable<string | null>(null)
  const isReturn = writable(false)
  // The URL fields this mount last read (what the gate and retry close over —
  // React's render-time values).
  let currentTransactionId: string | null = null
  let currentProvider: string | null = null
  let currentIsReturn = false
  const readUrl = (): void => {
    const search = typeof window === 'undefined' ? '' : window.location.search
    const params = new URLSearchParams(search)
    const tid =
      TRANSACTION_ID_PARAMS.map((name) => params.get(name)).find((value) => !!value) ?? null
    const prov = params.get('provider') || providerOption || null
    const returnFlag = Boolean(enabled && tid && prov)
    transactionId.set(tid)
    provider.set(prov)
    isReturn.set(returnFlag)
    currentTransactionId = tid
    currentProvider = prov
    currentIsReturn = returnFlag
  }
  readUrl()

  const status = writable<VerifyPaymentReturnStatus>('idle')
  const error = writable<Error | null>(null)
  // One attempt per transaction id per page — an effect that re-fires (auth
  // refresh) must not re-POST a purchase.
  let attempted: string | null = null

  // Whether the component is mounted when a verification settles.
  let mounted = true
  onDestroy(() => {
    mounted = false
  })

  const verify = async (): Promise<void> => {
    const userId = clientState?.user?.id ?? null
    const tid = currentTransactionId
    const prov = currentProvider
    if (!tid || !prov || !userId) return

    status.set('verifying')
    error.set(null)

    try {
      await http.post(`/users/${userId}/verify-payment/${prov}`, {
        subscriptionId: tid,
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
      }
      // React re-renders with the cleaned address: the URL fields re-read.
      readUrl()
    } catch (caught) {
      const failure = caught instanceof Error ? caught : new Error(String(caught))
      if (!mounted) {
        getLogger('useVerifyPaymentReturn').warn(
          'Verifying the payment failed after the page unmounted',
          { error: failure, provider: prov },
        )
        return
      }
      status.set('failed')
      error.set(failure)
      onError?.(failure)
    }
  }

  // The auth state this mount last saw; the verification gate reads it (React's
  // effect dependencies `state.initialized` and `userId`).
  let clientState: AuthState<UserProfile> | null = null

  // React's mount effect gate: verify once auth has hydrated and a user id is
  // known, at most once per transaction id per page.
  const runGate = (): void => {
    if (!clientState) return
    if (!currentIsReturn || !currentTransactionId) return
    // Auth is still hydrating from the httpOnly cookie — verifying now would
    // send the request unauthenticated.
    if (!clientState.initialized) return
    const userId = clientState.user?.id ?? null
    if (!userId) return
    if (attempted === currentTransactionId) return

    attempted = currentTransactionId
    void verify()
  }

  const stopAuth = authState.subscribe((current) => {
    clientState = current
    // React re-renders on every auth change, re-reading the URL fields.
    readUrl()
    runGate()
  })
  onDestroy(stopAuth)

  const retry = (): void => {
    attempted = currentTransactionId
    void verify()
  }

  return {
    status: { subscribe: status.subscribe },
    isReturn: { subscribe: isReturn.subscribe },
    provider: { subscribe: provider.subscribe },
    transactionId: { subscribe: transactionId.subscribe },
    error: { subscribe: error.subscribe },
    retry,
  }
}
