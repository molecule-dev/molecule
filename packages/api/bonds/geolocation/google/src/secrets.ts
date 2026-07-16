/**
 * Google geolocation secret definitions — self-registered at import time
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

/** Secret definitions required by the Google geolocation bond. */
export const geolocationGoogleSecretDefinitions: SecretDefinition[] = [
  {
    key: 'GOOGLE_MAPS_API_KEY',
    description:
      'Google Maps API key — Enable the Geocoding API, Places API, and Time Zone API in Google Cloud Console and create an API key restricted to those three APIs.',
    helpUrl: 'https://console.cloud.google.com/google/maps-apis/credentials',
    required: true,
    example: 'AIza...',
  },
]

registerSecrets(geolocationGoogleSecretDefinitions)
