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
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Starting a verification from the UI creates a real session:
 *   `createVerificationSession` is called, the app persists the returned
 *   `KycSession.sessionId` on the user's record with stored status `pending`,
 *   and the user is handed to the provider-hosted `session.url` — NOT a
 *   home-grown document-capture screen, and NOT marked verified at creation.
 * - [ ] COUNTERPARTY (the identity check runs out-of-band on the external
 *   vendor and can't be completed for real in-sandbox): verify the decision
 *   against the app's OWN stored KYC state — deliver a `verification.verified`
 *   (or `verification.requires_input` / `verification.canceled`) event to the
 *   webhook endpoint, or poll `getVerificationStatus`, and confirm the user's
 *   stored status flips `pending` → `verified` / `requires_input` / `canceled`
 *   and the UI shows it. Observe the transition, never guess it.
 * - [ ] KYC-gated features are enforced SERVER-SIDE: while the stored status is
 *   not `verified`, the restricted action is REJECTED by the server (not merely
 *   a hidden button); once `verified`, the same user is allowed. Flipping the
 *   stored status changes access after a full reload.
 * - [ ] `processWebhook` rejects a forged decision — a bad/missing signature
 *   THROWS and becomes a 4xx with NO state change (the user stays unverified);
 *   only a signature-verified event may flip stored status.
 * - [ ] A user CANNOT self-verify: no endpoint accepts a client-sent "verified"
 *   flag or lets a caller PATCH their own status, and landing back on
 *   `returnUrl` alone changes nothing — the only path to `verified` is a
 *   signature-verified webhook or a server-side `getVerificationStatus` check.
 * - [ ] SECURITY / PRIVACY — identity documents and PII stay server-side: the
 *   user is redirected to the provider-hosted flow (the app never receives or
 *   stores raw ID images), one user can't read another's session/status/PII by
 *   guessing its id, and neither the documents nor the webhook secret are
 *   logged in the clear.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
