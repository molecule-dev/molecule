/**
 * Resend secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Resend email bond. */
export const emailsResendSecretDefinitions: SecretDefinition[] = [
  {
    key: 'RESEND_API_KEY',
    description: 'Resend API key — Resend → API Keys → Create API Key (Sending access is enough).',
    helpUrl: 'https://resend.com/api-keys',
    required: true,
    example: 're_....',
  },
  {
    key: 'RESEND_FROM',
    description:
      'Resend default sender — Optional. A from address on a domain verified in Resend → Domains; used when a message has no from address.',
    helpUrl: 'https://resend.com/domains',
    required: false,
    example: 'Acme <no-reply@example.com>',
  },
]

registerSecrets(emailsResendSecretDefinitions)
