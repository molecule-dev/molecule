/**
 * Fitbit wearable bond secret definitions — self-registered at import time so the
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

import { registerSecrets } from '@molecule/api-secrets'
import type { SecretDefinition } from '@molecule/api-secrets'

/** Secret definitions required by the Fitbit wearable bond. */
export const wearableFitbitSecretDefinitions: SecretDefinition[] = [
  {
    key: 'OAUTH_FITBIT_CLIENT_ID',
    description:
      'Fitbit OAuth client ID — Register an application at dev.fitbit.com and copy the OAuth 2.0 Client ID.',
    helpUrl: 'https://dev.fitbit.com/apps',
    required: true,
  },
  {
    key: 'OAUTH_FITBIT_CLIENT_SECRET',
    description: 'Fitbit client secret — Shown on your registered Fitbit application page.',
    helpUrl: 'https://dev.fitbit.com/apps',
    required: false,
  },
]

registerSecrets(wearableFitbitSecretDefinitions)
