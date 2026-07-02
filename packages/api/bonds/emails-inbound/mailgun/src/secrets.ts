/**
 * Mailgun secret definitions (inbound routes) — self-registered at import
 * time so the runtime secrets registry (`@molecule/api-secrets`) can drive
 * boot-time configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry secrets
 * entry (label/instructions/setupUrl/example) via the fleet formula, so
 * packages sharing a key (MAILGUN_API_KEY/MAILGUN_DOMAIN with the outbound
 * bond) register byte-identical definitions and registration order never
 * matters.
 *
 * @module
 */

import { registerSecrets } from '@molecule/api-secrets'
import type { SecretDefinition } from '@molecule/api-secrets'

/** Secret definitions required by the Mailgun inbound-email bond. */
export const mailgunInboundSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MAILGUN_API_KEY',
    description:
      'Mailgun API key — Mailgun dashboard → Settings → API Security → create/copy a sending API key.',
    helpUrl: 'https://app.mailgun.com/settings/api_security',
    required: true,
  },
  {
    key: 'MAILGUN_DOMAIN',
    description:
      'Mailgun sending domain — Add and verify a sending domain in Mailgun (sandbox domains work for testing to authorized recipients).',
    helpUrl: 'https://app.mailgun.com/mg/sending/domains',
    required: true,
    example: 'mg.example.com',
  },
  {
    key: 'MAILGUN_INBOUND_REPLAY_WINDOW_SECONDS',
    description:
      'Mailgun inbound replay window — Max age (seconds) of accepted inbound webhook signatures — replay protection; the default is fine.',
    required: false,
    example: '300',
  },
]

registerSecrets(mailgunInboundSecretDefinitions)
