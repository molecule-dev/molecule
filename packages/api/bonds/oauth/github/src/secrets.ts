/**
 * GitHub OAuth secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
 * configuration reports and actionable "not configured" errors.
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

/** Secret definitions required by the GitHub OAuth bond. */
export const oauthGithubSecretDefinitions: SecretDefinition[] = [
  {
    key: 'OAUTH_GITHUB_CLIENT_ID',
    description:
      'GitHub OAuth client ID — GitHub → Settings → Developer settings → OAuth Apps → New OAuth App; set the callback URL to {apiUrl}/api/users/log-in/oauth.',
    helpUrl: 'https://github.com/settings/developers',
    required: true,
    example: 'Iv1.abc123...',
  },
  {
    key: 'OAUTH_GITHUB_CLIENT_SECRET',
    description:
      'GitHub OAuth client secret — Generate a client secret on your GitHub OAuth App page.',
    helpUrl: 'https://github.com/settings/developers',
    required: true,
  },
]

registerSecrets(oauthGithubSecretDefinitions)
