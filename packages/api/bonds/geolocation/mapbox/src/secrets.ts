/**
 * Mapbox geolocation secret definitions — self-registered at import time
 * so the runtime secrets registry (`@molecule/api-secrets`) can drive
 * boot-time configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry
 * secrets entry (label/instructions/setupUrl/example) via the fleet
 * formula, so packages sharing a key register byte-identical definitions
 * and registration order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the Mapbox geolocation bond. */
export const geolocationMapboxSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MAPBOX_ACCESS_TOKEN',
    description:
      'Mapbox access token — Copy the default public token (or create a scoped one) from your Mapbox account.',
    helpUrl: 'https://account.mapbox.com/access-tokens/',
    required: true,
    example: 'pk.ey...',
  },
]

registerSecrets(geolocationMapboxSecretDefinitions)
