/**
 * Vue composable for the post-checkout return: verify the purchase with the
 * API from the APP origin, where the session cookie applies.
 *
 * @module
 */

import {
  computed,
  type ComputedRef,
  getCurrentScope,
  onScopeDispose,
  type Ref,
  ref,
  watch,
} from 'vue'

import type { UserProfile } from '@molecule/app-auth'
import { getLogger } from '@molecule/app-logger'

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
  status: Ref<VerifyPaymentReturnStatus>

  /**
   * `true` while the URL identifies a purchase to verify. React re-reads the
   * URL on every render, so after a verified purchase cleans the address bar
   * this reads `false` again.
   */
  isReturn: ComputedRef<boolean>

  /** The provider named by the URL (or the `provider` option); `null` once the URL is clean. */
  provider: ComputedRef<string | null>

  /** The provider transaction/session id read from the URL; `null` once the URL is clean. */
  transactionId: ComputedRef<string | null>

  /** Why verification failed, when it did. */
  error: Ref<Error | null>

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
 * is never granted. The request this composable makes is a same-origin call
 * from a loaded app page, so the credentials apply. It waits for auth to
 * hydrate first: after the redirect the page is a cold load, and the session is
 * restored from the httpOnly cookie via `GET /users/me`.
 *
 * Verification is idempotent server-side (first-claim-wins on the transaction),
 * and this composable additionally runs at most once per transaction id per
 * page. Safe on pages that are also reached normally: with no id in the URL it
 * stays `idle` and issues no request.
 *
 * If the component unmounts while the request is in flight, a verified
 * purchase still refreshes the cached profile (the plan is paid for), but the
 * composable calls neither `onVerified` nor `onError` and leaves the URL alone:
 * by then the address may belong to another page. A failure after unmount is
 * logged instead.
 *
 * @param options - Provider fallback + lifecycle callbacks (see
 *   {@link UseVerifyPaymentReturnOptions}).
 * @returns The verification state (see {@link UseVerifyPaymentReturnResult}).
 *
 * @example
 * ```vue
 * <!-- /plan-updated — the page a provider returns the buyer to. -->
 * <script setup>
 * import { useVerifyPaymentReturn } from '@molecule/app-vue'
 *
 * const { status, retry } = useVerifyPaymentReturn()
 * </script>
 *
 * <template>
 *   <Spinner v-if="status === 'verifying'" />
 *   <button v-else-if="status === 'failed'" @click="retry">Try again</button>
 *   <h1 v-else>Thank you!</h1>
 * </template>
 * ```
 */
export function useVerifyPaymentReturn(
  options: UseVerifyPaymentReturnOptions = {},
): UseVerifyPaymentReturnResult {
  const { provider: providerOption, enabled = true, cleanUrl = true, onVerified, onError } = options

  const http = useHttpClient()
  const { state, refresh } = useAuth<UserProfile>()

  const status = ref<VerifyPaymentReturnStatus>('idle')
  const error = ref<Error | null>(null)
  // One attempt per transaction id per page — a watcher that re-fires (auth
  // refresh, an unrelated re-render) must not re-POST a purchase.
  let attempted: string | null = null
  let mounted = true

  if (getCurrentScope()) {
    onScopeDispose(() => {
      mounted = false
    })
  }

  // React re-reads `window.location.search` on every render, so the parsed
  // fields are LIVE: once the verified purchase cleans the URL, they read
  // null. The composable's own state changes are those renders — re-read the
  // URL when they flush (after the whole synchronous block, cleanup included).
  const locationSearch = ref(typeof window === 'undefined' ? '' : window.location.search)
  watch([status, error], () => {
    locationSearch.value = typeof window === 'undefined' ? '' : window.location.search
  })

  const parsed = computed(() => {
    const params = new URLSearchParams(locationSearch.value)
    return {
      transactionId:
        TRANSACTION_ID_PARAMS.map((name) => params.get(name)).find((value) => !!value) ?? null,
      provider: params.get('provider') || providerOption || null,
    }
  })

  const isReturn = computed(() =>
    Boolean(enabled && parsed.value.transactionId && parsed.value.provider),
  )

  const verify = async (): Promise<void> => {
    const userId = state.value.user?.id ?? null
    const { transactionId, provider } = parsed.value
    if (!transactionId || !provider || !userId) return

    status.value = 'verifying'
    error.value = null

    try {
      await http.post(`/users/${userId}/verify-payment/${provider}`, {
        subscriptionId: transactionId,
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
      status.value = 'verified'
      onVerified?.()

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
      status.value = 'failed'
      error.value = failure
      onError?.(failure)
    }
  }

  // Auth is still hydrating from the httpOnly cookie — verifying now would
  // send the request unauthenticated. Watch the session like React's effect
  // watches `state.initialized` and `userId`.
  watch(
    () => [state.value.initialized, state.value.user?.id ?? null] as const,
    () => {
      const userId = state.value.user?.id ?? null
      if (!isReturn.value) return
      if (!state.value.initialized || !userId) return
      if (attempted === parsed.value.transactionId) return
      attempted = parsed.value.transactionId
      void verify()
    },
    { immediate: true },
  )

  const retry = (): void => {
    attempted = parsed.value.transactionId
    void verify()
  }

  return {
    status,
    isReturn,
    provider: computed(() => parsed.value.provider),
    transactionId: computed(() => parsed.value.transactionId),
    error,
    retry,
  }
}
