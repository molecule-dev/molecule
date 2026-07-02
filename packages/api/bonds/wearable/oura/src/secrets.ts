/**
 * Oura wearable bond secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Oura wearable bond. */
export const wearableOuraSecretDefinitions: SecretDefinition[] = [
  {
    key: 'OAUTH_OURA_CLIENT_ID',
    description:
      'Oura OAuth client ID — Create an OAuth application in the Oura Cloud developer portal.',
    helpUrl: 'https://cloud.ouraring.com/oauth/applications',
    required: true,
  },
  {
    key: 'OAUTH_OURA_CLIENT_SECRET',
    description: 'Oura client secret — Shown when creating the OAuth application in Oura Cloud.',
    helpUrl: 'https://cloud.ouraring.com/oauth/applications',
    required: true,
  },
]

registerSecrets(wearableOuraSecretDefinitions)
