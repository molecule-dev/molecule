/**
 * Raw Mixpanel instance for advanced usage.
 *
 * @module
 */

import Mixpanel from 'mixpanel'

/**
 * Legacy export - the raw Mixpanel instance.
 * @deprecated Use provider or createProvider() instead.
 */
export const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN ?? '')
