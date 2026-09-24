/**
 * Webhook core interface for molecule.dev.
 *
 * Defines the standard interface for webhook dispatch providers
 * (HTTP, queue-backed, etc.).
 *
 * @remarks
 * This is OUTBOUND webhook DISPATCH — your app POSTing events to endpoints your users
 * register. (Verifying an INBOUND provider webhook, e.g. Stripe's, is the opposite
 * direction — you verify ITS signature; see `@molecule/api-payments`.) A weak dispatch
 * integration is an SSRF hole and a spoofable firehose:
 *
 * - **The destination URL is untrusted → SSRF.** A user-supplied {@link register} URL can
 *   point at `localhost`, a private range (`10.`/`192.168.`/`127.`), or the cloud metadata
 *   IP `169.254.169.254`. Validate + allowlist the scheme/host and BLOCK private/link-local
 *   targets BEFORE registering/dispatching, or a user can read internal services.
 * - **Deliveries are signed — share the secret so receivers verify.** The provider signs
 *   each payload with {@link WebhookRegistration.secret} (from {@link WebhookOptions.secret},
 *   auto-generated if omitted). Give that secret to the receiver so they can check the HMAC
 *   header; an unverified webhook on the receiving end is spoofable.
 * - **Delivery is AT-LEAST-ONCE — receivers must dedup on the delivery id.** Failed
 *   deliveries are retried, and a receiver that processed an event but whose 2xx response was
 *   lost gets the retry as an indistinguishable duplicate. The HMAC signature is NO help here
 *   (identical payloads sign identically). Each delivery carries a stable id header
 *   (`x-webhook-delivery-id` on the HTTP bond) that is the SAME across all retries of one
 *   logical delivery and unique per new event — receivers dedup on it (process each id once).
 * - **`dispatch(event)` is NOT owner-scoped.** It delivers to every active registration whose
 *   `events` include that exact name, across all users — dispatching a plain `order.created`
 *   for one user's order leaks it to every user's endpoint. Put the owner in the event name
 *   (as in the example) or keep registrations admin-only.
 * - **Bond first.** Every call throws until `setProvider(...)` runs.
 * - **Scope registrations to their owner.** Persist the returned {@link WebhookRegistration}
 *   id with the owner's `user_id` and scope list/delete by it — an unscoped list/delete is
 *   an IDOR.
 * - **Send only what the event needs.** Never put secrets, tokens, or unrelated PII in the
 *   payload — it leaves your system.
 *
 * @example
 * ```typescript
 * import { isIP } from 'node:net'
 *
 * import express from 'express'
 *
 * import { dispatch, register, setProvider } from '@molecule/api-webhook'
 * import { createProvider, isPrivateAddress } from '@molecule/api-webhook-http'
 *
 * // Startup: bond the dispatcher (timeout/retryDelay in ms; retryCount = retries after the 1st).
 * setProvider(createProvider({ timeout: 10_000, retryCount: 3, retryDelay: 2000 }))
 *
 * // Registration-time SSRF guard for a friendly 400 (the HTTP bond also blocks at connect).
 * const isAllowedWebhookUrl = (raw: string): boolean => {
 *   if (!URL.canParse(raw)) return false
 *   const url = new URL(raw)
 *   const host = url.hostname.replace(/^\[|\]$/g, '')
 *   const isInternal = host === 'localhost' || (isIP(host) !== 0 && isPrivateAddress(host))
 *   return url.protocol === 'https:' && !isInternal
 * }
 *
 * // dispatch() hits EVERY registration for an event name — scope the name to its owner.
 * const orderCreatedFor = (userId: string): string => `user.${userId}.order.created`
 *
 * const router = express.Router() // mount AFTER your auth middleware sets res.locals.userId
 * router.post('/webhooks', express.json(), async (req, res) => {
 *   const url = String(req.body?.url ?? '')
 *   if (!isAllowedWebhookUrl(url)) return void res.status(400).json({ error: 'URL not allowed' })
 *   const hook = await register(url, [orderCreatedFor(String(res.locals.userId))])
 *   // Persist hook.id with the user (registrations are in-memory in this bond). Return the
 *   // secret ONCE so the receiver can verify the x-webhook-signature HMAC.
 *   res.status(201).json({ id: hook.id, secret: hook.secret })
 * })
 *
 * // When the event happens for a user — never throws on delivery failure:
 * const results = await dispatch(orderCreatedFor('user-123'), { orderId: 'ord_123', total: 4999 })
 * const failed = results.filter((result) => !result.success) // status 0 = network/blocked/timeout
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Registering a webhook endpoint through the app's UI/API succeeds, and
 *   an event the app dispatches actually produces a delivery. The sandbox
 *   CAPTURES outbound deliveries instead of POSTing — read them with the
 *   `read_activity` tool (filter type 'webhook'); never mock the dispatch or
 *   modify production code to expose the payload.
 * - [ ] The captured delivery carries the signature header (derived from the
 *   registration's secret), a stable delivery-id header the receiver can dedup
 *   on (at-least-once), and an event payload free of secrets/unrelated PII.
 * - [ ] A registration targeting a private/link-local/metadata destination
 *   (`localhost`, `10.…`, `169.254.169.254`) is REJECTED before any dispatch.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
export * from './webhook.js'
