/**
 * GitLab OAuth secret definitions — self-registered at import time so the
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

/** Secret definitions required by the GitLab OAuth bond. */
export const oauthGitlabSecretDefinitions: SecretDefinition[] = [
  {
    key: 'OAUTH_GITLAB_CLIENT_ID',
    description:
      'GitLab OAuth application ID — GitLab → User settings → Applications → Add new application with the {apiUrl}/api/users/log-in/oauth redirect URI.',
    helpUrl: 'https://gitlab.com/-/user_settings/applications',
    required: true,
  },
  {
    key: 'OAUTH_GITLAB_CLIENT_SECRET',
    description: 'GitLab OAuth secret — Shown when creating the application in GitLab.',
    helpUrl: 'https://gitlab.com/-/user_settings/applications',
    required: true,
  },
]

registerSecrets(oauthGitlabSecretDefinitions)
