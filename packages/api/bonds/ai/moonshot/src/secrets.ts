/**
 * Moonshot secret definitions — self-registered at import time so the
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

/** Secret definitions required by the Moonshot AI bond. */
export const aiMoonshotSecretDefinitions: SecretDefinition[] = [
  {
    key: 'MOONSHOT_API_KEY',
    description: 'Moonshot API key — Create an API key in the Moonshot AI console.',
    helpUrl: 'https://platform.moonshot.ai/console/api-keys',
    required: true,
    example: 'sk-...',
  },
]

registerSecrets(aiMoonshotSecretDefinitions)
