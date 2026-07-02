/**
 * Doppler secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Doppler secrets bond. */
export const secretsDopplerSecretDefinitions: SecretDefinition[] = [
  {
    key: 'DOPPLER_TOKEN',
    description:
      'Doppler service token — Create a service token for your project config (Project → Access → Service Tokens).',
    helpUrl: 'https://dashboard.doppler.com/',
    required: true,
    example: 'dp.st....',
  },
]

registerSecrets(secretsDopplerSecretDefinitions)
