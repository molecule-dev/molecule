/**
 * Shippo secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Shippo shipping bond. */
export const shippingShippoSecretDefinitions: SecretDefinition[] = [
  {
    key: 'SHIPPO_API_KEY',
    description: 'Shippo API token — Copy the test or live token from Shippo → Settings → API.',
    helpUrl: 'https://apps.goshippo.com/settings/api',
    required: true,
    example: 'shippo_test_...',
  },
]

registerSecrets(shippingShippoSecretDefinitions)
