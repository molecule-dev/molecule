/**
 * Dropbox Sign (HelloSign) secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Dropbox Sign (HelloSign) e-signature bond. */
export const esignHellosignSecretDefinitions: SecretDefinition[] = [
  {
    key: 'HELLOSIGN_API_KEY',
    description:
      'Dropbox Sign (HelloSign) API key — Generate an API key in Dropbox Sign → Account settings → API.',
    helpUrl: 'https://app.hellosign.com/home/myAccount#api',
    required: true,
  },
]

registerSecrets(esignHellosignSecretDefinitions)
