/**
 * Alpha Vantage secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Alpha Vantage equity-prices bond. */
export const equityPricesAlphaVantageSecretDefinitions: SecretDefinition[] = [
  {
    key: 'ALPHA_VANTAGE_API_KEY',
    description: 'Alpha Vantage API key — Request a free API key on the Alpha Vantage site.',
    helpUrl: 'https://www.alphavantage.co/support/#api-key',
    required: true,
  },
]

registerSecrets(equityPricesAlphaVantageSecretDefinitions)
