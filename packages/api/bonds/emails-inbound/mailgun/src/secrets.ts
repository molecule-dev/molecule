/**
 * Mailgun secret definitions (inbound routes) — self-registered at import
 * time so the runtime secrets registry (`@molecule/api-secrets`) can drive
 * boot-time configuration reports and actionable "not configured" errors.
 *
 * The MAILGUN_API_KEY description is kept byte-identical to the outbound
 * `@molecule/api-emails-mailgun` bond's registration — the registry is
 * keyed by secret name and last-import-wins, so identical content makes
 * registration order irrelevant.
 *
 * @module
 */

import { registerSecrets } from '@molecule/api-secrets'
import type { SecretDefinition } from '@molecule/api-secrets'

/** Secret definitions required by the Mailgun inbound-email bond. */
export const mailgunInboundSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MAILGUN_API_KEY',
    description: 'Mailgun private API key — powers transactional email sending.',
    helpUrl: 'https://app.mailgun.com/settings/api_security',
    required: true,
    example: 'key-...',
  },
]

registerSecrets(mailgunInboundSecretDefinitions)
