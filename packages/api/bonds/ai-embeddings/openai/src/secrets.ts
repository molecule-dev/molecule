/**
 * OpenAI embeddings secret definitions — self-registered at import time so
 * the runtime secrets registry (`@molecule/api-secrets`) can drive boot-time
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

/** Secret definitions required by the OpenAI embeddings bond. */
export const aiEmbeddingsOpenaiSecretDefinitions: SecretDefinition[] = [
  {
    key: 'OPENAI_API_KEY',
    description: 'OpenAI API key — Create a secret key on the OpenAI platform (API keys page).',
    helpUrl: 'https://platform.openai.com/api-keys',
    required: true,
    example: 'sk-proj-...',
  },
]

registerSecrets(aiEmbeddingsOpenaiSecretDefinitions)
