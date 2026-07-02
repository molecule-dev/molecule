/**
 * Mailgun secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
 *
 * @module
 */

import { registerSecrets } from '@molecule/api-secrets'
import type { SecretDefinition } from '@molecule/api-secrets'

/** Secret definitions required by the Mailgun email bond. */
export const mailgunSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MAILGUN_API_KEY',
    description: 'Mailgun private API key — powers transactional email sending.',
    helpUrl: 'https://app.mailgun.com/settings/api_security',
    required: true,
    example: 'key-...',
  },
  {
    key: 'MAILGUN_DOMAIN',
    description: 'Mailgun sending domain (a domain you verified in Mailgun, e.g. mg.yourapp.com).',
    helpUrl: 'https://app.mailgun.com/mg/sending/domains',
    required: true,
    example: 'mg.yourapp.com',
  },
]

registerSecrets(mailgunSecretDefinitions)
