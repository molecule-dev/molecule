/**
 * Raw Mixpanel instance for advanced usage.
 *
 * @module
 */

import Mixpanel from 'mixpanel'

import { configNotConfiguredError } from '@molecule/api-secrets'

/** The concrete client type returned by `Mixpanel.init()`. */
type MixpanelClient = ReturnType<typeof Mixpanel.init>

let _mixpanel: MixpanelClient | null = null

/**
 * Lazily initializes the raw Mixpanel client from MIXPANEL_TOKEN.
 *
 * Initialization MUST stay lazy: `Mixpanel.init('')` throws, and this module
 * is loaded via the package barrel — an eager init crashed the entire API at
 * import time whenever MIXPANEL_TOKEN wasn't set (analytics config must never
 * take the server down at boot).
 *
 * @returns The shared raw Mixpanel client.
 * @throws {Error} A tagged `config.notConfigured` (503) error naming
 *   MIXPANEL_TOKEN when the env var is not set.
 */
const getClient = (): MixpanelClient => {
  if (!_mixpanel) {
    const token = process.env.MIXPANEL_TOKEN
    if (!token) {
      throw configNotConfiguredError('MIXPANEL_TOKEN', 'analytics')
    }
    _mixpanel = Mixpanel.init(token)
  }
  return _mixpanel
}

/**
 * Legacy export - the raw Mixpanel instance (lazy-initialized via Proxy on
 * first property access; throws an actionable `config.notConfigured` error if
 * MIXPANEL_TOKEN is unset at that point).
 * @deprecated Use provider or createProvider() instead.
 */
export const mixpanel: MixpanelClient = new Proxy({} as MixpanelClient, {
  get(_, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    return Reflect.set(getClient(), prop, value)
  },
})
