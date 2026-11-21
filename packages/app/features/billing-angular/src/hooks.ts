/**
 * Angular hooks for the standard `/billing/*` endpoints.
 *
 * These functions wrap `@molecule/app-angular`'s HTTP primitives so callers get
 * the same `{ data, loading, error }` ergonomics as the React package, with the
 * state as signals and the actions as plain functions. Call them in an
 * injection context (a component field initializer or constructor). The
 * endpoints they hit are provided server-side by `@molecule/api-entitlements` +
 * `@molecule/api-payments-stripe` (see
 * `mlcl/templates/apps/<app>/api/routes/billing.ts` for the routes).
 *
 * NOTE on URLs: flagship apps do NOT bond an HTTP client baseURL — each
 * page-level caller passes the full `/api/...` path explicitly. We match
 * that convention here so the hooks work in any flagship app whether or
 * not it later opts into a baseURL-bonded client.
 *
 * @module
 */

import { type Signal, signal } from '@angular/core'

import { useGet, useHttpClient, type UseHttpResult } from '@molecule/app-angular'

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
  readonly data: Signal<T | null>

  /** True while a request is in flight. */
  readonly loading: Signal<boolean>

  /** Last error thrown by the action, or `null` on success. */
  readonly error: Signal<Error | null>
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
  const data = signal<CheckoutResponse | null>(null)
  const loading = signal(false)
  const error = signal<Error | null>(null)

  const start = async (priceId: string): Promise<CheckoutResponse | null> => {
    data.set(null)
    loading.set(true)
    error.set(null)
    try {
      const response = await client.post<CheckoutResponse>('/api/billing/checkout', { priceId })
      data.set(response.data)
      loading.set(false)
      return response.data
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)))
      loading.set(false)
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
  const data = signal<CancelResponse | null>(null)
  const loading = signal(false)
  const error = signal<Error | null>(null)

  const cancel = async (): Promise<CancelResponse | null> => {
    data.set(null)
    loading.set(true)
    error.set(null)
    try {
      const response = await client.post<CancelResponse>('/api/billing/cancel', {})
      data.set(response.data)
      loading.set(false)
      return response.data
    } catch (err) {
      error.set(err instanceof Error ? err : new Error(String(err)))
      loading.set(false)
      return null
    }
  }

  return { data, loading, error, cancel }
}
