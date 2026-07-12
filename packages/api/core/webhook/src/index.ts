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
 * - **Scope registrations to their owner.** Persist the returned {@link WebhookRegistration}
 *   id with the owner's `user_id` and scope list/delete by it — an unscoped list/delete is
 *   an IDOR.
 * - **Send only what the event needs.** Never put secrets, tokens, or unrelated PII in the
 *   payload — it leaves your system.
 *
 * @example
 * ```typescript
 * import { setProvider, register, dispatch } from '@molecule/api-webhook'
 * setProvider(httpWebhookProvider) // bond at startup
 *
 * // SSRF guard: reject private/link-local/metadata destinations BEFORE registering.
 * if (!isAllowedWebhookUrl(url)) throw new Error('Destination not allowed')
 * const hook = await register(url, ['order.created']) // provider signs deliveries with hook.secret
 * await saveWebhookRow({ id: hook.id, userId: getUserId(res) }) // own it → scope list/delete by user
 * // Share hook.secret with the receiver so they can verify the signature header.
 *
 * const results = await dispatch('order.created', { orderId: '123' })
 * console.log(results[0].success) // true
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './webhook.js'
