/**
 * MiniMax secret definitions — self-registered at import time so the
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

/** Secret definitions required by the MiniMax AI bond. */
export const aiMinimaxSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MINIMAX_API_KEY',
    description: 'MiniMax API key — Create an interface key in the MiniMax platform user center.',
    helpUrl: 'https://platform.minimax.io/',
    required: true,
  },
]

registerSecrets(aiMinimaxSecretDefinitions)
