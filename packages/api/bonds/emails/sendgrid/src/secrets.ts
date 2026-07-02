/**
 * SendGrid secret definitions — self-registered at import time so the
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

/** Secret definitions required by the SendGrid email bond. */
export const emailsSendgridSecretDefinitions: SecretDefinition[] = [
  {
    key: 'SENDGRID_API_KEY',
    description:
      'SendGrid API key — SendGrid → Settings → API Keys → Create API Key with Mail Send permission.',
    helpUrl: 'https://app.sendgrid.com/settings/api_keys',
    required: true,
    example: 'SG....',
  },
]

registerSecrets(emailsSendgridSecretDefinitions)
