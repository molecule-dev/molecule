/**
 * Post-checkout redirect URLs, shared by every hosted-checkout payment bond.
 *
 * @module
 */

/** Default route the buyer is returned to after a completed checkout. */
export const DEFAULT_PLAN_UPDATED_PATH = '/plan-updated'

/** The app origin a provider should return the buyer to. */
export interface ResolvedAppOrigin {
  /** The origin, with any trailing slash removed. */
  appOrigin: string

  /**
   * `true` when no `APP_ORIGIN`/`ORIGIN` was configured and a localhost
   * fallback was used. Deployed apps must treat this as a misconfiguration —
   * the buyer would be returned to localhost after paying — so bonds log a
   * warning naming the missing variable.
   */
  usingFallbackOrigin: boolean
}

/**
 * Resolves the origin the app is served from: `APP_ORIGIN`, else `ORIGIN`, else
 * a localhost fallback on the conventional dev frontend port (the API `PORT`
 * minus 1000, e.g. 4030 → 3030).
 *
 * This is the origin the browser holds session cookies for, so it is the only
 * safe target for any provider redirect that must arrive authenticated.
 *
 * @returns The app origin and whether it came from the localhost fallback.
 */
export const resolveAppOrigin = (): ResolvedAppOrigin => {
  // Conventional dev frontend lives on the API port - 1000 (e.g. 4030 → 3030).
  // Mirrors the polish-v2 dispatcher's port pairing.
  const apiPort = Number(process.env.PORT) || 4000
  const fallbackAppOrigin = `http://localhost:${apiPort - 1000}`
  const configuredOrigin = process.env.APP_ORIGIN || process.env.ORIGIN || ''

  return {
    appOrigin: (configuredOrigin || fallbackAppOrigin).replace(/\/+$/, ''),
    usingFallbackOrigin: !configuredOrigin,
  }
}

/**
 * Prefixes a configured route with `/` when it was written without one, so
 * `account/upgraded` cannot concatenate into `https://app.example.comaccount/…`.
 *
 * @param path - A route path from configuration (possibly empty).
 * @returns The path with a leading slash, or the empty string unchanged.
 */
const withLeadingSlash = (path: string): string =>
  path && !path.startsWith('/') ? `/${path}` : path

/** Options for {@link resolveCheckoutRedirectUrls}. */
export interface CheckoutRedirectOptions {
  /**
   * The bond's provider name (e.g. `'stripe'`, `'paypal'`). Added to the
   * success URL as `?provider=…` so the app's return page knows which
   * provider to verify the purchase with.
   */
  provider: string

  /**
   * The provider's placeholder for the checkout/session id it will substitute
   * into the success URL — Stripe's `'{CHECKOUT_SESSION_ID}'`, for example.
   * Appended as `&sessionId=…`.
   *
   * Omit it for providers that append their own identifier parameters to the
   * return URL (PayPal adds `subscription_id`/`token`); the app's return page
   * accepts those too.
   */
  sessionIdToken?: string
}

/** Resolved redirect URLs for a hosted-checkout handoff. */
export interface CheckoutRedirectUrls {
  /** Where the provider sends the buyer after a completed purchase. */
  successUrl: string

  /** Where the provider sends the buyer if they abandon the purchase. */
  cancelUrl: string

  /** The app origin both URLs were built from. */
  appOrigin: string

  /**
   * `true` when no `APP_ORIGIN`/`ORIGIN` was configured and a localhost
   * fallback was used. Deployed apps must treat this as a misconfiguration —
   * the buyer would be returned to localhost after paying — so bonds log a
   * warning naming the missing variable.
   */
  usingFallbackOrigin: boolean
}

/**
 * Builds the success/cancel URLs a hosted checkout returns the buyer to.
 *
 * **Both URLs point at the APP origin, never the API origin.** The session
 * cookies that authenticate a browser are set for the app's host, so a
 * top-level redirect from the provider's domain to a *different* API host
 * arrives with no credentials and any authenticated callback there answers
 * `401` — the buyer pays and lands on an error page with no plan granted. The
 * app page reached instead calls
 * `POST /users/:id/verify-payment/:provider` with the id in the query, from
 * the app origin, where the credentials do apply.
 *
 * Routes are configurable because only the app knows them:
 * `PAYMENTS_PLAN_UPDATED_PATH` (default `/plan-updated`) and
 * `PAYMENTS_CHECKOUT_CANCEL_PATH` (default: the app root).
 *
 * @param options - The provider name and its session-id placeholder.
 * @returns The success/cancel URLs, the app origin, and whether a localhost
 *   fallback origin had to be used.
 *
 * @example
 * ```ts
 * const { successUrl, cancelUrl } = resolveCheckoutRedirectUrls({
 *   provider: 'stripe',
 *   sessionIdToken: '{CHECKOUT_SESSION_ID}',
 * })
 * // → https://app.example.com/plan-updated?provider=stripe&sessionId={CHECKOUT_SESSION_ID}
 * ```
 */
export const resolveCheckoutRedirectUrls = (
  options: CheckoutRedirectOptions,
): CheckoutRedirectUrls => {
  const { appOrigin, usingFallbackOrigin } = resolveAppOrigin()

  const planUpdatedPath = withLeadingSlash(
    process.env.PAYMENTS_PLAN_UPDATED_PATH || DEFAULT_PLAN_UPDATED_PATH,
  )
  const cancelPath = withLeadingSlash(process.env.PAYMENTS_CHECKOUT_CANCEL_PATH || '')

  // The provider substitutes its own id into the placeholder, so the token is
  // written verbatim — never URL-encoded (Stripe rejects an encoded
  // `%7BCHECKOUT_SESSION_ID%7D` placeholder).
  const query = `?provider=${encodeURIComponent(options.provider)}${
    options.sessionIdToken ? `&sessionId=${options.sessionIdToken}` : ''
  }`

  return {
    successUrl: `${appOrigin}${planUpdatedPath}${query}`,
    cancelUrl: `${appOrigin}${cancelPath}`,
    appOrigin,
    usingFallbackOrigin,
  }
}

/**
 * Builds the URL a hosted billing portal returns the user to when they exit.
 *
 * Same rule as checkout: the destination is the APP origin, so the returning
 * browser is authenticated. `returnPath` is accepted from the caller (the page
 * that opened the portal, so the user lands back where they were) but is only
 * honored when it is a same-origin ABSOLUTE PATH — a value like
 * `https://evil.example` or `//evil.example` would otherwise turn this into an
 * open redirect off a provider's domain.
 *
 * @param returnPath - Optional app-relative path to return to (e.g. `/billing`).
 *   Falls back to `PAYMENTS_BILLING_RETURN_PATH`, then the app root.
 * @returns The absolute return URL.
 */
export const resolveBillingPortalReturnUrl = (returnPath?: string): string => {
  const { appOrigin } = resolveAppOrigin()
  const requested = typeof returnPath === 'string' ? returnPath : ''
  const safeRequested =
    requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\')
      ? requested
      : ''
  const configured = withLeadingSlash(process.env.PAYMENTS_BILLING_RETURN_PATH || '')

  return `${appOrigin}${safeRequested || configured}`
}
