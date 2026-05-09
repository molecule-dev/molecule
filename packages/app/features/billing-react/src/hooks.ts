/**
 * React hooks for the standard `/api/billing/*` endpoints.
 *
 * These hooks wrap `@molecule/app-react`'s HTTP primitives so callers get
 * familiar `{ data, loading, error }` ergonomics. The endpoints they hit
 * are provided server-side by `@molecule/api-entitlements` +
 * `@molecule/api-payments-stripe` (see
 * `mlcl/templates/apps/<app>/api/routes/billing.ts` for the routes).
 *
 * @module
 */

import { useCallback, useState } from 'react'

import { useGet, useHttpClient, type UseHttpResult } from '@molecule/app-react'

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
  data: T | null

  /** True while a request is in flight. */
  loading: boolean

  /** Last error thrown by the action, or `null` on success. */
  error: Error | null
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
  const [state, setState] = useState<BillingActionState<CheckoutResponse>>({
    data: null,
    loading: false,
    error: null,
  })

  const start = useCallback(
    async (priceId: string): Promise<CheckoutResponse | null> => {
      setState({ data: null, loading: true, error: null })
      try {
        const response = await client.post<CheckoutResponse>('/api/billing/checkout', { priceId })
        setState({ data: response.data, loading: false, error: null })
        return response.data
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ data: null, loading: false, error })
        return null
      }
    },
    [client],
  )

  return { ...state, start }
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
  const [state, setState] = useState<BillingActionState<CancelResponse>>({
    data: null,
    loading: false,
    error: null,
  })

  const cancel = useCallback(async (): Promise<CancelResponse | null> => {
    setState({ data: null, loading: true, error: null })
    try {
      const response = await client.post<CancelResponse>('/api/billing/cancel', {})
      setState({ data: response.data, loading: false, error: null })
      return response.data
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setState({ data: null, loading: false, error })
      return null
    }
  }, [client])

  return { ...state, cancel }
}
