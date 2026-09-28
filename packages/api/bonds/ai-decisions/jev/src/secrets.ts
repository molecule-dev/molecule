/**
 * Jev secret definitions — self-registered at import time so the runtime
 * secrets registry (`@molecule/api-secrets`) can drive boot-time configuration
 * reports and actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions required by the Jev decisions bond. */
export const aiDecisionsJevSecretDefinitions: SecretDefinition[] = [
  {
    key: 'TYPESAFE_API_KEY',
    description:
      'TypeSafe API key — Create an API key in your TypeSafe AI account; it is sent as a bearer token to the Jev API.',
    helpUrl: 'https://docs.typesafe.ai/api',
    required: true,
    example: 'ts-...',
  },
]

registerSecrets(aiDecisionsJevSecretDefinitions)
