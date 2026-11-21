/**
 * Vue composables for the standard `/billing/*` endpoints.
 *
 * These composables wrap `@molecule/app-vue`'s HTTP primitives so callers get
 * the same `{ data, loading, error }` ergonomics as the React package, with
 * reactive state in Vue's own idiom (refs for the values, plain functions for
 * the actions). The endpoints they hit are provided server-side by
 * `@molecule/api-entitlements` + `@molecule/api-payments-stripe` (see
 * `mlcl/templates/apps/<app>/api/routes/billing.ts` for the routes).
 *
 * NOTE on URLs: flagship apps do NOT bond an HTTP client baseURL — each
 * page-level caller passes the full `/api/...` path explicitly. We match
 * that convention here so the composables work in any flagship app whether
 * or not it later opts into a baseURL-bonded client.
 *
 * @module
 */

import { type Ref, ref } from 'vue'

import { useGet, useHttpClient, type UseHttpResult } from '@molecule/app-vue'

import type {
  BillingStatus,
  CancelResponse,
  CheckoutResponse,
  PricingTiersResponse,
} from './types.js'

/**
 * Fetch the public pricing data once on mount. Useful inside a
 * pricing/upgrade page where the tiers are needed before render.
 *
 * @template TLimits - Application-specific tier limits shape.
 * @returns Async-state for the pricing tiers response.
 */
export function usePricingTiers<TLimits = unknown>(): UseHttpResult<PricingTiersResponse<TLimits>> {
  return useGet<PricingTiersResponse<TLimits>>('/api/billing/tiers', { immediate: true })
}

/**
 * Fetch the signed-in user's current subscription state once on mount.
 * Returns 401 from the API when the user is not authenticated; consumers
 * should treat the absence of `data` as "anonymous → free tier".
 *
 * @template TLimits - Application-specific tier limits shape.
 * @returns Async-state for the user's billing status.
 */
export function useBillingStatus<TLimits = unknown>(): UseHttpResult<BillingStatus<TLimits>> {
  return useGet<BillingStatus<TLimits>>('/api/billing/status', { immediate: true })
}

/** Async-state shape returned by `useStartCheckout` / `useCancelSubscription`. */
export interface BillingActionState<T> {
  /** The most recent response from the action, or `null` before the first call. */
  data: Ref<T | null>

  /** True while a request is in flight. */
  loading: Ref<boolean>

  /** Last error thrown by the action, or `null` on success. */
  error: Ref<Error | null>
}

/**
 * Start a Stripe Checkout session for a given Stripe price ID. The
 * returned `start(priceId)` posts to `/api/billing/checkout`; the
 * response is either `{ checkoutUrl }` (for new subscribers — redirect
 * the browser) or `{ updated: true }` (for existing subscribers —
 * refresh the page).
 *
 * @returns Async-state plus a `start` function.
 */
export function useStartCheckout(): BillingActionState<CheckoutResponse> & {
  start: (priceId: string) => Promise<CheckoutResponse | null>
} {
  const client = useHttpClient()
  const data: Ref<CheckoutResponse | null> = ref(null)
  const loading: Ref<boolean> = ref(false)
  const error: Ref<Error | null> = ref(null)

  const start = async (priceId: string): Promise<CheckoutResponse | null> => {
    data.value = null
    loading.value = true
    error.value = null
    try {
      const response = await client.post<CheckoutResponse>('/api/billing/checkout', { priceId })
      data.value = response.data
      loading.value = false
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      loading.value = false
      return null
    }
  }

  return { data, loading, error, start }
}

/**
 * Cancel the user's active subscription at the end of the current
 * billing period. Returns the response from the bonded payment provider.
 *
 * @returns Async-state plus a `cancel` function.
 */
export function useCancelSubscription(): BillingActionState<CancelResponse> & {
  cancel: () => Promise<CancelResponse | null>
} {
  const client = useHttpClient()
  const data: Ref<CancelResponse | null> = ref(null)
  const loading: Ref<boolean> = ref(false)
  const error: Ref<Error | null> = ref(null)

  const cancel = async (): Promise<CancelResponse | null> => {
    data.value = null
    loading.value = true
    error.value = null
    try {
      const response = await client.post<CancelResponse>('/api/billing/cancel', {})
      data.value = response.data
      loading.value = false
      return response.data
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
      loading.value = false
      return null
    }
  }

  return { data, loading, error, cancel }
}
