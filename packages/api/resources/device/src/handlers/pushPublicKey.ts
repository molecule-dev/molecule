import { get } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

/**
 * Push public key — `GET /devices/push/public-key`.
 *
 * Returns the server's VAPID public key so browsers can create a push
 * subscription with `applicationServerKey` (Chromium rejects keyless
 * subscriptions). The client then stores the resulting subscription on its
 * device row via `PATCH /devices/:id { pushSubscription, hasPushSubscription }`
 * — the contract the api-side push fan-outs read.
 *
 * The key is public by design (it ships inside every subscription request the
 * browser makes to the push service), so the route needs no auth.
 *
 * Bond-gated like `oauthAuthorize` in `@molecule/api-resource-user`: provider
 * knowledge stays in the bond — the handler asks the bonded push-notifications
 * provider (`get('push-notifications')`) for its `getPublicKey()`. A provider
 * that is not bonded yields a clean 404; one that is bonded but unconfigured
 * (no `VAPID_PUBLIC_KEY`) yields a 503 — never a crash.
 *
 * @returns A request handler that responds `200` with `{ publicKey }`.
 */
export const pushPublicKey = () => {
  return async () => {
    const pushProvider = get<{ getPublicKey?: () => string | undefined }>('push-notifications')

    if (!pushProvider?.getPublicKey) {
      return {
        statusCode: 404,
        body: {
          error: t('device.error.pushNotConfigured', undefined, {
            defaultValue: 'Push notifications are not configured on this server.',
          }),
          errorKey: 'device.error.pushNotConfigured',
        },
      }
    }

    const publicKey = pushProvider.getPublicKey()
    if (!publicKey) {
      // Bonded but unconfigured (VAPID_PUBLIC_KEY unset) — an operator
      // problem, not a client one.
      return {
        statusCode: 503,
        body: {
          error: t('device.error.pushNotConfigured', undefined, {
            defaultValue: 'Push notifications are not configured on this server.',
          }),
          errorKey: 'device.error.pushNotConfigured',
        },
      }
    }

    return { statusCode: 200, body: { publicKey } }
  }
}
