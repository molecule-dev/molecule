/**
 * X (Twitter) OAuth secret definitions — self-registered at import time so
 * the runtime secrets registry (`@molecule/api-secrets`) can drive
 * boot-time configuration reports and actionable "not configured" errors.
 *
 * Content is derived MECHANICALLY from this package's mlcl registry
 * secrets entry (label/instructions/setupUrl/example) via the fleet
 * formula, so packages sharing a key register byte-identical definitions
 * and registration order never matters.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the X (Twitter) OAuth bond. */
export const oauthTwitterSecretDefinitions: SecretDefinition[] = [
  {
    key: 'OAUTH_TWITTER_CLIENT_ID',
    description:
      'X (Twitter) OAuth client ID — Create a project + app in the X developer portal, enable OAuth 2.0, and copy the client ID.',
    helpUrl: 'https://developer.x.com/en/portal/dashboard',
    required: true,
  },
  {
    key: 'OAUTH_TWITTER_CLIENT_SECRET',
    description:
      'X (Twitter) OAuth client secret — Shown when enabling OAuth 2.0 for your app in the X developer portal.',
    helpUrl: 'https://developer.x.com/en/portal/dashboard',
    required: true,
  },
]

registerSecrets(oauthTwitterSecretDefinitions)
