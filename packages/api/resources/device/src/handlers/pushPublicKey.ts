import { get, getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

const logger = getLogger()

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
 * provider (`get('push-notifications')`) for its key: `fetchPublicKey()` when the
 * provider keeps its key behind a service (the molecule.dev hosted bond, whose
 * synchronous `getPublicKey()` is empty until that call has run), else
 * `getPublicKey()`. A provider that is not bonded yields a clean 404; one that is
 * bonded but unconfigured (no `VAPID_PUBLIC_KEY`), or whose key request fails
 * (logged), yields a 503 — never a crash.
 *
 * @returns A request handler that responds `200` with `{ publicKey }`.
 */
export const pushPublicKey = () => {
  return async () => {
    const pushProvider = get<{
      getPublicKey?: () => string | undefined
      fetchPublicKey?: () => Promise<string | undefined>
    }>('push-notifications')

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

    let publicKey: string | undefined
    try {
      publicKey = pushProvider.fetchPublicKey
        ? await pushProvider.fetchPublicKey()
        : pushProvider.getPublicKey()
    } catch (error) {
      // The hosted service refused or could not be reached: the route answers 503
      // like an unconfigured provider, and the cause goes to the operator's log.
      logger.error('device push public key: the push provider could not fetch its key', {
        error,
      })
    }
    if (!publicKey) {
      // Bonded but unconfigured (VAPID_PUBLIC_KEY unset) or its key request
      // failed — an operator problem, not a client one.
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
