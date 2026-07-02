/**
 * IEX Cloud secret definitions — self-registered at import time so the
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

/** Secret definitions required by the IEX Cloud equity-prices bond. */
export const equityPricesIexSecretDefinitions: SecretDefinition[] = [
  {
    key: 'IEX_API_KEY',
    description:
      'IEX Cloud API token — Copy an API token from the IEX Cloud console (service availability may vary).',
    helpUrl: 'https://iexcloud.io/',
    required: true,
    example: 'pk_...',
  },
]

registerSecrets(equityPricesIexSecretDefinitions)
