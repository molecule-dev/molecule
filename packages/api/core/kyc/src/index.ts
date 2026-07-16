/**
 * KYC / identity verification core interface for molecule.dev (server-side).
 *
 * Defines a stack-neutral contract for KYC bonds (Stripe Identity, Persona,
 * Onfido, Sumsub, etc.). Bond a provider at startup, then call the
 * convenience wrappers from anywhere.
 *
 * @remarks
 * - **Verification state comes ONLY from the server-side provider — never from
 *   the browser.** The user landing back on `returnUrl` proves nothing (anyone
 *   can navigate there), and a client-sent "verified" flag proves less. Update
 *   your stored KYC state from {@link processWebhook} events (or a server-side
 *   {@link getVerificationStatus} check) and gate features on YOUR stored state.
 * - **`processWebhook` needs the RAW request body** (string/Buffer exactly as
 *   received) — providers sign the exact byte sequence, so a JSON-parsed and
 *   re-serialized body fails signature verification. Mount the webhook route
 *   with a raw-body reader, pass the headers verbatim, return 4xx when it
 *   throws (bad signature) and 2xx only after processing succeeds.
 * - Redirect the user to `session.url` (the provider-hosted flow) — never build
 *   your own document-capture UI. `url` MAY be `null` for SDK-based providers,
 *   and hosted sessions expire (`expiresAt`) — create a fresh session rather
 *   than reusing an old one. Persist `session.sessionId` keyed to the user so
 *   webhook events correlate.
 * - Statuses are non-linear: handle `requires_input` (start a NEW session) and
 *   `canceled`, not just `verified`. Provider API keys / webhook secrets are
 *   bond-specific env vars (see the bond's docs) and stay SERVER-SIDE.
 *
 * @example
 * ```typescript
 * import { setProvider, createVerificationSession } from '@molecule/api-kyc'
 * import { provider } from '@molecule/api-kyc-stripe-identity'
 *
 * setProvider(provider)
 *
 * const session = await createVerificationSession({
 *   userId: 'user-123',
 *   type: 'document',
 *   returnUrl: 'https://app.example.com/verify/done',
 * })
 *
 * // Redirect the end user to session.url ...
 * ```
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
