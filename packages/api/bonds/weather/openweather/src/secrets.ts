/**
 * OpenWeather weather bond secret definitions — self-registered at import time so the
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

import { registerSecrets } from '@molecule/api-secrets'
import type { SecretDefinition } from '@molecule/api-secrets'

/** Secret definitions required by the OpenWeather weather bond. */
export const weatherOpenweatherSecretDefinitions: SecretDefinition[] = [
  {
    key: 'OPENWEATHER_API_KEY',
    description:
      'OpenWeather API key — Sign up at OpenWeatherMap (free tier available) and copy your API key.',
    helpUrl: 'https://home.openweathermap.org/api_keys',
    required: true,
  },
]

registerSecrets(weatherOpenweatherSecretDefinitions)
