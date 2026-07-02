/**
 * Polygon.io secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Polygon.io equity-prices bond. */
export const equityPricesPolygonSecretDefinitions: SecretDefinition[] = [
  {
    key: 'POLYGON_API_KEY',
    description: 'Polygon.io API key — Copy your API key from the Polygon.io dashboard.',
    helpUrl: 'https://polygon.io/dashboard/api-keys',
    required: true,
  },
]

registerSecrets(equityPricesPolygonSecretDefinitions)
