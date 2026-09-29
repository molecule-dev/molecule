/**
 * Jeff secret definitions — self-registered at import time so the runtime
 * secrets registry (`@molecule/api-secrets`) can drive boot-time configuration
 * reports and actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions used by the Jeff decisions bond. */
export const aiDecisionsJeffSecretDefinitions: SecretDefinition[] = [
  {
    key: 'JEFF_URL',
    description:
      'Jeff server URL — The base URL of your jeff-serve host (clone github.com/firelex/jeff, uv sync, download a checkpoint, then JEFF_CHECKPOINT=<dir> uv run jeff-serve). Defaults to http://localhost:8000.',
    helpUrl: 'https://github.com/firelex/jeff#readme',
    required: false,
    example: 'http://localhost:8000',
  },
  {
    key: 'JEFF_API_KEY',
    description:
      'Jeff server API key — The bearer token your jeff-serve host requires, if you set JEFF_API_KEY on the server.',
    helpUrl: 'https://github.com/firelex/jeff#readme',
    required: false,
    example: 'a-long-random-string',
  },
]

registerSecrets(aiDecisionsJeffSecretDefinitions)
