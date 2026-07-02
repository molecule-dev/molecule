/**
 * Microsoft OAuth secret definitions — self-registered at import time so
 * the runtime secrets registry (`@molecule/api-secrets`) can drive
 * boot-time configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry
 * secrets entry (label/instructions/setupUrl/example) via the fleet
 * formula, so packages sharing a key (the OAUTH_MICROSOFT_* keys with the
 * Microsoft calendar bond) register byte-identical definitions and
 * registration order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the Microsoft OAuth bond. */
export const oauthMicrosoftSecretDefinitions: SecretDefinition[] = [
  {
    key: 'OAUTH_MICROSOFT_CLIENT_ID',
    description:
      'Microsoft application (client) ID — Microsoft Entra ID → App registrations → New registration; copy the Application (client) ID.',
    helpUrl: 'https://entra.microsoft.com/',
    required: true,
  },
  {
    key: 'OAUTH_MICROSOFT_CLIENT_SECRET',
    description:
      'Microsoft client secret — App registration → Certificates & secrets → New client secret; copy the Value.',
    helpUrl: 'https://entra.microsoft.com/',
    required: true,
  },
  {
    key: 'OAUTH_MICROSOFT_TENANT_ID',
    description:
      'Microsoft directory (tenant) ID — Copy the Directory (tenant) ID from the app registration overview, or use "common" for multi-tenant.',
    helpUrl: 'https://entra.microsoft.com/',
    required: false,
    example: 'common',
  },
]

registerSecrets(oauthMicrosoftSecretDefinitions)
