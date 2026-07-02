/**
 * EasyPost secret definitions — self-registered at import time so the
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

/** Secret definitions required by the EasyPost shipping bond. */
export const shippingEasypostSecretDefinitions: SecretDefinition[] = [
  {
    key: 'EASYPOST_API_KEY',
    description:
      'EasyPost API key — Copy the test or production API key from EasyPost → Account → API Keys.',
    helpUrl: 'https://app.easypost.com/account/api-keys',
    required: true,
    example: 'EZAK...',
  },
]

registerSecrets(shippingEasypostSecretDefinitions)
