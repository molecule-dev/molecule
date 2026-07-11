/**
 * Local AI bond secret definitions — self-registered at import time so the
 * runtime secrets registry (`@molecule/api-secrets`) can surface them in
 * boot-time configuration reports.
 *
 * Both entries are OPTIONAL (`required: false`): a local endpoint runs keyless
 * and defaults to Ollama's `http://localhost:11434/v1`, so nothing here can
 * block boot. They exist only to document the overrides in the config report.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Optional secret/config overrides recognised by the local AI bond. */
export const aiLocalSecretDefinitions: SecretDefinition[] = [
  {
    key: 'LOCAL_AI_BASE_URL',
    description:
      'Base URL of the OpenAI-compatible local endpoint, including the version segment (e.g. http://localhost:11434/v1 for Ollama).',
    required: false,
    default: 'http://localhost:11434/v1',
    example: 'http://localhost:11434/v1',
  },
  {
    key: 'LOCAL_AI_API_KEY',
    description:
      'Optional API key for the local endpoint. Most local servers ignore auth; leave unset to run keyless.',
    required: false,
  },
]

registerSecrets(aiLocalSecretDefinitions)
