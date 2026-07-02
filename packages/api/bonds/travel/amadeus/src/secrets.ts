/**
 * Amadeus secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Amadeus travel bond. */
export const travelAmadeusSecretDefinitions: SecretDefinition[] = [
  {
    key: 'AMADEUS_CLIENT_ID',
    description:
      'Amadeus API key — Create an app in Amadeus for Developers (Self-Service) and copy the API Key.',
    helpUrl: 'https://developers.amadeus.com/my-apps',
    required: true,
  },
  {
    key: 'AMADEUS_CLIENT_SECRET',
    description: 'Amadeus API secret — Copy the API Secret from your Amadeus app page.',
    helpUrl: 'https://developers.amadeus.com/my-apps',
    required: true,
  },
]

registerSecrets(travelAmadeusSecretDefinitions)
