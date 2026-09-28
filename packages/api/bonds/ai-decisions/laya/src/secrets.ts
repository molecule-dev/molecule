/**
 * Laya secret definitions — self-registered at import time so the runtime
 * secrets registry (`@molecule/api-secrets`) can drive boot-time configuration
 * reports and actionable "not configured" errors.
 *
 * @module
 */

import type { SecretDefinition } from '@molecule/api-secrets'
import { registerSecrets } from '@molecule/api-secrets'

/** Secret definitions used by the Laya decisions bond. */
export const aiDecisionsLayaSecretDefinitions: SecretDefinition[] = [
  {
    key: 'LAYA_URL',
    description:
      'Laya server URL — The base URL of your laya-serve host (pip install "laya[serve]" && laya-serve, or the Docker image). Defaults to http://localhost:8000.',
    helpUrl: 'https://github.com/NandhaKishorM/laya/blob/main/docs/http-api.md',
    required: false,
    example: 'http://localhost:8000',
  },
  {
    key: 'LAYA_API_KEY',
    description:
      'Laya server API key — The bearer token your laya-serve host requires, if you set LAYA_API_KEY on the server.',
    helpUrl: 'https://github.com/NandhaKishorM/laya/blob/main/docs/http-api.md',
    required: false,
    example: 'a-long-random-string',
  },
]

registerSecrets(aiDecisionsLayaSecretDefinitions)
