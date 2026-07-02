/**
 * Messenger secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry secrets
 * entry (label/instructions/setupUrl/example) via the fleet formula, so
 * packages sharing a key register byte-identical definitions and
 * registration order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the Messenger channel bond. */
export const channelMessengerSecretDefinitions: SecretDefinition[] = [
  {
    key: 'CHANNEL_MESSENGER_PAGE_ACCESS_TOKEN',
    description:
      'Messenger page access token — Create a Meta app with the Messenger product and generate a Page access token for your page.',
    helpUrl: 'https://developers.facebook.com/apps',
    required: true,
  },
  {
    key: 'CHANNEL_MESSENGER_APP_SECRET',
    description: 'Meta app secret — Your Meta app → App settings → Basic → App secret.',
    helpUrl: 'https://developers.facebook.com/apps',
    required: true,
  },
]

registerSecrets(channelMessengerSecretDefinitions)
