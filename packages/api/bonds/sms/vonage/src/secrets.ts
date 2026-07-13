/**
 * Vonage secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Vonage SMS bond. */
export const smsVonageSecretDefinitions: SecretDefinition[] = [
  {
    key: 'VONAGE_API_KEY',
    description: 'Vonage API key — Copy the API key from the Vonage API Dashboard.',
    helpUrl: 'https://dashboard.nexmo.com/',
    required: true,
  },
  {
    key: 'VONAGE_API_SECRET',
    description: 'Vonage API secret — Copy the API secret from the Vonage API Dashboard.',
    helpUrl: 'https://dashboard.nexmo.com/',
    required: true,
  },
  {
    key: 'VONAGE_FROM_NUMBER',
    description:
      'Vonage from number — Buy or verify a phone number (or alphanumeric sender ID) in Vonage and use it in E.164 format.',
    helpUrl: 'https://dashboard.nexmo.com/your-numbers',
    required: true,
    example: '+15551234567',
  },
]

registerSecrets(smsVonageSecretDefinitions)
